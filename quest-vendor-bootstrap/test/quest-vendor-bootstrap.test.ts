import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as QuestVendorBootstrap from '../lib/quest-vendor-bootstrap-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new QuestVendorBootstrap.QuestVendorBootstrapStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
