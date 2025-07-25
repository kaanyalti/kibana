/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerlessTestConfig } from '../../../api_integration_deployment_agnostic/default_configs/serverless.config.base';
import { deploymentAgnosticSpacesServices } from '../services';

export default createServerlessTestConfig<typeof deploymentAgnosticSpacesServices>({
  services: deploymentAgnosticSpacesServices,
  serverlessProject: 'security',
  testFiles: [require.resolve('./apis/index.serverless')],
  junit: {
    reportName: 'Serverless Security - Deployment-agnostic API Integration Tests',
  },
});
