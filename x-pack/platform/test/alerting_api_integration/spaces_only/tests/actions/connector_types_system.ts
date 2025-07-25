/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Spaces } from '../../scenarios';
import { getUrlPrefix } from '../../../common/lib/space_test_utils';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function listActionTypesTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('connector_types', () => {
    it('should return 200 with list of connector types containing defaults', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/internal/actions/connector_types`
      );

      function createActionTypeMatcher(id: string, name: string) {
        return (actionType: { id: string; name: string }) => {
          return actionType.id === id && actionType.name === name;
        };
      }

      expect(response.status).to.eql(200);
      // Check for values explicitly in order to avoid this test failing each time plugins register
      // a new action type
      expect(
        response.body.some(createActionTypeMatcher('test.index-record', 'Test: Index Record'))
      ).to.be(true);
    });

    it('should return system action types', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/internal/actions/connector_types`
      );

      const actionTypes = response.body as Array<{ is_system_action_type: boolean }>;

      expect(actionTypes.some((actionType) => actionType.is_system_action_type)).to.be(true);
    });
  });
}
