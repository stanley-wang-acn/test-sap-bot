const {
    AttachmentPrompt,
    ChoiceFactory,
    ChoicePrompt,
    ComponentDialog,
    ConfirmPrompt,
    DialogSet,
    DialogTurnStatus,
    NumberPrompt,
    TextPrompt,
    WaterfallDialog
} = require('botbuilder-dialogs');
const { UserProfile } = require('../userProfile');

const ATTACHMENT_PROMPT = 'ATTACHMENT_PROMPT';
const CHOICE_PROMPT = 'CHOICE_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const NAME_PROMPT = 'NAME_PROMPT';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const USER_PROFILE = 'USER_PROFILE';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const ARCHITECTURE = 'Architecture';
const SPECIFICATION = 'Specification';
const EBS_REPLY = 'The first business requirement is to create a functionality in the EBS pre-processor to identify cash application relevant EBS files and send a copy of the EBS file for further processing in the SAP SCP payment advise for customer payments. This will be done by creating a business rule with the Bank Number/BIC and Bank Account Number/IBAN, and then checking each incoming EBS file using the business rule by comparing the values in the xml tags with the values in the business rule. If any of the comparisons is successful, a copy of the incoming file will be sent to the payment advise flows within SAP SCP. The process should not impact the main EBS pre-processing flows and should continue with the next steps regardless of the business validation.' + '\n\n\n' + 'The second business requirement is to upload electronic bank statements (EBS) files to the SAP system. XX makes vendor payments through banks and receives customer payments through several banks. At the end of each business day, the banks send an electronic bank statement outlining the opening and closing balances and the transactions that occurred that day. The EBS file will be received through SWIFT and needs to be uploaded to SAP to reconcile XX cash accounts with the available cash in the bank. The same process is followed for both vendor and customer payments. The EBS files from the banks will be sent in BAI2 format and SAP will read these files and load the transactions accordingly.' + '\n\n\n' + 'The role of EBS in the business requirements is to provide the electronic bank statements that are received from the banks, which are used to reconcile XXs cash accounts with the available cash in the bank. EBS is a pre-processor in the first requirement and is used to validate the incoming EBS files to ensure they are relevant to AR cash application. In the second requirement, EBS is the source of the electronic bank statements that need to be uploaded to the SAP system.';
const SPEC_QUESTION_PROMPT = 'I can help with ' + SPECIFICATION + '. Please enter what you are looking for. You can ask questions like this one:\n\n\nPlease find me the business requirements related to EBS.';
const SPEC_QUESTION_ANSWER = 'I found below from  ' + SPECIFICATION + '.\n\n\n' + EBS_REPLY + '.\n\n\n\nDo you want to look at the detailed specifications for above summary? Select Yes to look at it, Select No to ask a new question.'

class UserProfileDialog extends ComponentDialog {
    constructor(userState) {
        super('userProfileDialog');

        this.userProfile = userState.createProperty(USER_PROFILE);

        this.addDialog(new TextPrompt(NAME_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new NumberPrompt(NUMBER_PROMPT, this.agePromptValidator));
        this.addDialog(new AttachmentPrompt(ATTACHMENT_PROMPT, this.picturePromptValidator));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.intentStep.bind(this),
            this.clientStep.bind(this),
            this.lookupStep.bind(this),
            this.architectureSummaryStep.bind(this),
            this.architectureStep.bind(this),
            this.summaryStep.bind(this)
        ]));

        this.initialDialogId = WATERFALL_DIALOG;
    }

    /**
     * The run method handles the incoming activity (in the form of a TurnContext) and passes it through the dialog system.
     * If no dialog is active, it will start the default dialog.
     * @param {*} turnContext
     * @param {*} accessor
     */
    async run(turnContext, accessor) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }
    async intentStep(step) {
        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
        // Running a prompt here means the next WaterfallStep will be run when the user's response is received.
        return await step.prompt(CHOICE_PROMPT, {
            prompt: 'Welcome and what can I do for you? You can select from options below.',
            choices: ChoiceFactory.toChoices([ARCHITECTURE, SPECIFICATION])
        });
    }

    async clientStep(step) {
        step.values.intent = step.result.value;
        if(step.values.intent === ARCHITECTURE) { // this is for architecture
            return await step.prompt(NAME_PROMPT, `I can help with ${ step.values.intent }. Please enter client name.`);
        }
        else if(step.values.intent === SPECIFICATION){
            return await step.prompt(NAME_PROMPT, SPEC_QUESTION_PROMPT);
        }
    }

    async lookupStep(step) {
        if(step.values.intent === ARCHITECTURE) {
            step.values.client = step.result;
            return await step.prompt(CONFIRM_PROMPT, `I found one architecture for client ${ step.result }.\n\n\nDo you want to look at its summary? Select Yes to look at it, Select No to start a new architecture.`, ['yes', 'no']);
        }
        else if(step.values.intent === SPECIFICATION){
            return await step.prompt(CONFIRM_PROMPT, SPEC_QUESTION_ANSWER, ['yes', 'no']);
        }
    }

    async architectureSummaryStep(step) {
        if(step.values.intent === ARCHITECTURE) {
            const archSummary = ' is made up of four components: Customer, Finance, HR, and Supply Chain. Their Customer solution is SAP (ECC/S4/S4CE/CX), their HR solution is SAP SuccessFactors, their Finance solution is ECC, and their Supply Chain solution is S/4 Brownfield. No connected or enabled solutions were mentioned, nor was a Hyperscaler specified.'
            if (step.result) {
                // User said "yes" so we will give back the summary of the architecture
                return await step.prompt(CONFIRM_PROMPT, `Here is the summary of the architecture: ${ step.values.client } ${archSummary}.\n\n\nDo you want to look at the architecture designed for above summary? Select Yes to look at it, Select No to start a new architecture.`, ['yes', 'no']);
            } 
            else 
            {
                // User said "no" so we will go to architecture step
                return await step.prompt(NAME_PROMPT, `Sure I can help with the architecture for ${ step.values.client }. What components do you have for your organization? A sample answer could be Customer, Finance, HR, and Supply Chain`);
            }
        }
        else if(step.values.intent === SPECIFICATION){
            if (step.result) {
                // User said "yes" so we will give back the spec
                return await step.next(true);            
            } 
            else {
                // User said "no" so we will go to ask spec question
                return await step.prompt(NAME_PROMPT, SPEC_QUESTION_PROMPT);
            }
        }
    }

    async architectureStep(step) {
        if(step.values.intent === ARCHITECTURE) {
            if (step.result) {
                // User said "yes" so we will retrieve the architecture from back-end
                return await step.next(true);
            }
            else {
                return await step.prompt(NAME_PROMPT, `Sure I can help with the architecture for ${ step.values.client }. What components do you have for your organization? A sample answer could be Customer, Finance, HR, and Supply Chain`);
            }
        }
        else if(step.values.intent === SPECIFICATION){
            if (step.result === true) {
                // User said "yes" so we will retrieve the spec from back-end
                return await step.next(true);
            }
            else {
                return await step.prompt(CONFIRM_PROMPT, SPEC_QUESTION_ANSWER, ['yes', 'no']);
            }
        }
    }


    async summaryStep(step) {
        if (step.result) {
            // Get the current profile object from user state.
            const userProfile = await this.userProfile.get(step.context, new UserProfile());

            userProfile.intent = step.values.intent;
            userProfile.client = step.values.client;

            let msg = `Your request for ${ userProfile.intent } is received and your deliverable is on the way.`;
            await step.context.sendActivity(msg);
        } else {
            await step.context.sendActivity('I am just a demo and can no longer take questions. See you next time.');
        }

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is the end.
        return await step.endDialog();
    }

}

module.exports.UserProfileDialog = UserProfileDialog;
