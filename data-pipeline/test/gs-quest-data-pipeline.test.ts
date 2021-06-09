import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as GsQuestDataPipeline from '../lib/gs-quest-stack-data-pipeline';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new GsQuestDataPipeline.GsQuestDataPipelineStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
