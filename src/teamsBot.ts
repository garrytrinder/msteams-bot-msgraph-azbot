import {
  ConversationState,
  StatePropertyAccessor,
  TeamsActivityHandler,
  TurnContext,
  UserState,
} from 'botbuilder';
import {MainDialog} from './dialogs/mainDialog';

export class TeamsBot extends TeamsActivityHandler {
  conversationState: ConversationState;
  userState: UserState;
  dialog: MainDialog;
  dialogState: StatePropertyAccessor;

  constructor(
    conversationState: ConversationState,
    userState: UserState,
    dialog: MainDialog
  ) {
    console.log('TeamsBot: constructor');
    super();
    this.conversationState = conversationState;
    this.userState = userState;
    this.dialog = dialog;
    this.dialogState = this.conversationState.createProperty('DialogState');

    this.onMessage(
      async (
        context: TurnContext,
        next: () => Promise<void>
      ): Promise<void> => {
        console.log('TeamsBot: onMessage');
        await this.dialog.run(context, this.dialogState);
        await next();
      }
    );

    this.onMembersAdded(async (context, next): Promise<void> => {
      console.log('TeamsBot: onMembersAdded');
      const {membersAdded} = context.activity;
      for (let cnt = 0; cnt < membersAdded.length; cnt++) {
        if (membersAdded[cnt].id) {
          await context.sendActivity(
            "Hi there! I'm a Teams bot that will echo what you said to me."
          );
          break;
        }
      }
      await next();
    });
  }

  async handleTeamsSigninVerifyState(context: TurnContext): Promise<void> {
    console.log('TeamsBot: handleTeamsSigninVerifyState');
    await this.dialog.run(context, this.dialogState);
  }

  async handleTeamsSigninTokenExchange(context: TurnContext): Promise<void> {
    console.log('TeamsBot: handleTeamsSigninTokenExchange');
    await this.dialog.run(context, this.dialogState);
  }

  async run(context: TurnContext): Promise<void> {
    console.log('TeamsBot: run');
    await super.run(context);
    await this.conversationState.saveChanges(context, false);
    await this.userState.saveChanges(context, false);
  }
}
