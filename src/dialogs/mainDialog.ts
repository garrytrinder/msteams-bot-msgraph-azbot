import {
  WaterfallDialog,
  DialogSet,
  DialogTurnStatus,
  OAuthPrompt,
  ComponentDialog,
  DialogState,
  WaterfallStepContext,
  DialogContext,
  DialogTurnResult,
} from 'botbuilder-dialogs';
import config from '../../config';
import {
  Activity,
  ActivityTypes,
  CloudAdapter,
  StatePropertyAccessor,
  TurnContext,
} from 'botbuilder';
import {AdaptiveCards} from '@microsoft/adaptivecards-tools';
import {TokenCard} from '../types';

const MAIN_DIALOG = 'MainDialog';
const MAIN_WATERFALL_DIALOG = 'MainWaterfallDialog';
const OAUTH_PROMPT = 'OAuthPrompt';

export class MainDialog extends ComponentDialog {
  connectionName: string;

  constructor() {
    console.log('MainDialog: constructor');
    super(MAIN_DIALOG);
    this.connectionName = config.oauthConnectionName;

    this.addDialog(
      new OAuthPrompt(OAUTH_PROMPT, {
        connectionName: config.oauthConnectionName,
        text: 'Please Sign In',
        title: 'Sign In',
        timeout: 300000,
      })
    );
    this.addDialog(
      new WaterfallDialog(MAIN_WATERFALL_DIALOG, [
        this.promptStep.bind(this),
        this.ensureOauthStep.bind(this),
        this.displayTokenStep.bind(this),
      ])
    );

    this.initialDialogId = MAIN_WATERFALL_DIALOG;
  }

  async run(
    context: TurnContext,
    accessor: StatePropertyAccessor<DialogState>
  ): Promise<void> {
    console.log('MainDialog: run');
    const dialogSet = new DialogSet(accessor);
    dialogSet.add(this);

    const dialogContext = await dialogSet.createContext(context);
    const {status} = await dialogContext.continueDialog();
    if (status === DialogTurnStatus.empty) {
      await dialogContext.beginDialog(this.id);
    }
  }

  async promptStep(
    stepContext: WaterfallStepContext
  ): Promise<DialogTurnResult<unknown>> {
    console.log('MainDialog: promptStep');
    try {
      return await stepContext.beginDialog(OAUTH_PROMPT);
    } catch (err) {
      console.error(err);
    }
  }

  async ensureOauthStep(
    stepContext: WaterfallStepContext
  ): Promise<DialogTurnResult<unknown>> {
    console.log('MainDialog: ensureOauth');
    const {result} = stepContext;

    if (result) {
      return await stepContext.beginDialog(OAUTH_PROMPT);
    }

    return await stepContext.endDialog();
  }

  async displayTokenStep(
    stepContext: WaterfallStepContext
  ): Promise<DialogTurnResult<unknown>> {
    console.log('MainDialog: displayToken');
    const {result} = stepContext;
    if (result) {
      const {token} = result;
      const template = await import('../cards/token.json');
      const card = AdaptiveCards.declare<TokenCard>(template).render({token});
      const attachment = {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: card,
      };

      const message: Partial<Activity> = {
        type: ActivityTypes.Message,
        attachments: [attachment],
      };

      await stepContext.context.sendActivity(message);
    }
    return await stepContext.endDialog();
  }

  async onBeginDialog(
    dialogContext: DialogContext,
    options: unknown
  ): Promise<DialogTurnResult<unknown>> {
    console.log('MainDialog: onBeginDialog');
    const result = await this.interrupt(dialogContext);
    if (result) {
      return result;
    }

    return await super.onBeginDialog(dialogContext, options);
  }

  async onContinueDialog(
    dialogContext: DialogContext
  ): Promise<DialogTurnResult<unknown>> {
    console.log('MainDialog: onContinueDialog');
    const result = await this.interrupt(dialogContext);
    if (result) {
      return result;
    }

    return await super.onContinueDialog(dialogContext);
  }

  async interrupt(
    dialogContext: DialogContext
  ): Promise<DialogTurnResult<unknown>> {
    console.log('MainDialog: interrupt');
    const {activity, turnState, adapter} = dialogContext.context;
    const {type, text} = activity;

    if (type === ActivityTypes.Message) {
      const message = text ? text.toLowerCase() : '';

      if (message === 'logout') {
        const userTokenClient = turnState.get(
          (adapter as CloudAdapter).UserTokenClientKey
        );

        await userTokenClient.signOutUser(
          activity.from.id,
          this.connectionName,
          activity.channelId
        );

        await dialogContext.context.sendActivity('You have been signed out.');
        return await dialogContext.cancelAllDialogs();
      }
    }
  }
}
