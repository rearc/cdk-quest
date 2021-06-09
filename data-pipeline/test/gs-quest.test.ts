import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as GsQuest from '../lib/gs-quest-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new GsQuest.GsQuestStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
