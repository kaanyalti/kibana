/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CaseSeverity,
  ConnectorTypes,
  CustomFieldTypes,
} from '@kbn/cases-plugin/common/types/domain';
import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

import {
  removeServerGeneratedPropertiesFromSavedObject,
  getConfigurationOutput,
  deleteConfiguration,
  getConfiguration,
  createConfiguration,
  getConfigurationRequest,
  ensureSavedObjectIsAuthorized,
} from '../../../../common/lib/api';
import {
  obsOnly,
  secOnly,
  obsOnlyRead,
  secOnlyRead,
  noKibanaPrivileges,
  superUser,
  globalRead,
  obsSecRead,
  obsSec,
} from '../../../../common/lib/authentication/users';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');

  describe('get_configure', () => {
    afterEach(async () => {
      await deleteConfiguration(es);
    });

    it('should return an empty find body correctly if no configuration is loaded', async () => {
      const configuration = await getConfiguration({ supertest });
      expect(configuration).to.eql([]);
    });

    it('should return a configuration', async () => {
      await createConfiguration(supertest);

      const configuration = await getConfiguration({ supertest });
      const data = removeServerGeneratedPropertiesFromSavedObject(configuration[0]);

      expect(data).to.eql(getConfigurationOutput());
    });

    it('should return a configuration with customFields', async () => {
      const customFields = {
        customFields: [
          { key: 'hello', label: 'text', type: CustomFieldTypes.TEXT, required: false },
          {
            key: 'goodbye',
            label: 'toggle',
            type: CustomFieldTypes.TOGGLE,
            required: true,
            defaultValue: false,
          },
          {
            key: 'num',
            label: 'number',
            type: CustomFieldTypes.NUMBER,
            required: true,
            defaultValue: 1,
          },
        ],
      };
      await createConfiguration(
        supertest,
        getConfigurationRequest({
          overrides: customFields,
        })
      );
      const configuration = await getConfiguration({ supertest });

      const data = removeServerGeneratedPropertiesFromSavedObject(configuration[0]);
      expect(data).to.eql(getConfigurationOutput(false, customFields));
    });

    it('should return a configuration with templates', async () => {
      const mockTemplates = [
        {
          key: 'test_template_1',
          name: 'First test template',
          description: 'This is a first test template',
          tags: [],
          caseFields: null,
        },
        {
          key: 'test_template_2',
          name: 'Second test template',
          description: 'This is a second test template',
          tags: ['foobar'],
          caseFields: {
            title: 'Case with sample template 2',
            description: 'case desc',
            severity: CaseSeverity.LOW,
            category: null,
            tags: ['sample-4'],
            assignees: [],
            customFields: [],
            connector: {
              id: 'none',
              name: 'My Connector',
              type: ConnectorTypes.none,
              fields: null,
            },
          },
        },
        {
          key: 'test_template_3',
          name: 'Third test template',
          description: 'This is a third test template',
          caseFields: {
            title: 'Case with sample template 3',
            tags: ['sample-3'],
          },
        },
      ];

      const templates = {
        templates: mockTemplates,
      };

      await createConfiguration(
        supertest,
        getConfigurationRequest({
          overrides: templates,
        })
      );
      const configuration = await getConfiguration({ supertest });

      const data = removeServerGeneratedPropertiesFromSavedObject(configuration[0]);
      expect(data).to.eql(
        getConfigurationOutput(false, {
          templates: mockTemplates,
        })
      );
    });

    it('should get a single configuration', async () => {
      await createConfiguration(supertest, getConfigurationRequest({ id: 'connector-2' }));
      await createConfiguration(supertest);
      const res = await getConfiguration({ supertest });

      expect(res.length).to.eql(1);
      const data = removeServerGeneratedPropertiesFromSavedObject(res[0]);
      expect(data).to.eql(getConfigurationOutput());
    });

    it('should return by descending order', async () => {
      await createConfiguration(supertest, getConfigurationRequest({ id: 'connector-2' }));
      await createConfiguration(supertest);
      const res = await getConfiguration({ supertest });

      const data = removeServerGeneratedPropertiesFromSavedObject(res[0]);
      expect(data).to.eql(getConfigurationOutput());
    });

    describe('rbac', () => {
      it('should return the correct configuration', async () => {
        await createConfiguration(supertestWithoutAuth, getConfigurationRequest(), 200, {
          user: secOnly,
          space: 'space1',
        });

        await createConfiguration(
          supertestWithoutAuth,
          { ...getConfigurationRequest(), owner: 'observabilityFixture' },
          200,
          {
            user: obsOnly,
            space: 'space1',
          }
        );

        for (const scenario of [
          {
            user: globalRead,
            numberOfExpectedCases: 2,
            owners: ['securitySolutionFixture', 'observabilityFixture'],
          },
          {
            user: superUser,
            numberOfExpectedCases: 2,
            owners: ['securitySolutionFixture', 'observabilityFixture'],
          },
          { user: secOnlyRead, numberOfExpectedCases: 1, owners: ['securitySolutionFixture'] },
          { user: obsOnlyRead, numberOfExpectedCases: 1, owners: ['observabilityFixture'] },
          {
            user: obsSecRead,
            numberOfExpectedCases: 2,
            owners: ['securitySolutionFixture', 'observabilityFixture'],
          },
        ]) {
          const configuration = await getConfiguration({
            supertest: supertestWithoutAuth,
            query: { owner: scenario.owners },
            expectedHttpCode: 200,
            auth: {
              user: scenario.user,
              space: 'space1',
            },
          });

          ensureSavedObjectIsAuthorized(
            configuration,
            scenario.numberOfExpectedCases,
            scenario.owners
          );
        }
      });

      for (const scenario of [
        { user: noKibanaPrivileges, space: 'space1' },
        { user: secOnly, space: 'space2' },
      ]) {
        it(`User ${scenario.user.username} with role(s) ${scenario.user.roles.join()} and space ${
          scenario.space
        } - should NOT read a case configuration`, async () => {
          // super user creates a configuration at the appropriate space
          await createConfiguration(supertestWithoutAuth, getConfigurationRequest(), 200, {
            user: superUser,
            space: scenario.space,
          });

          // user should not be able to read configurations at the appropriate space
          await getConfiguration({
            supertest: supertestWithoutAuth,
            expectedHttpCode: 403,
            auth: {
              user: scenario.user,
              space: scenario.space,
            },
          });
        });
      }

      it('should respect the owner filter when having permissions', async () => {
        await Promise.all([
          createConfiguration(supertestWithoutAuth, getConfigurationRequest(), 200, {
            user: obsSec,
            space: 'space1',
          }),
          createConfiguration(
            supertestWithoutAuth,
            { ...getConfigurationRequest(), owner: 'observabilityFixture' },
            200,
            {
              user: obsSec,
              space: 'space1',
            }
          ),
        ]);

        const res = await getConfiguration({
          supertest: supertestWithoutAuth,
          query: { owner: 'securitySolutionFixture' },
          auth: {
            user: obsSec,
            space: 'space1',
          },
        });

        ensureSavedObjectIsAuthorized(res, 1, ['securitySolutionFixture']);
      });

      it('should return the correct cases when trying to exploit RBAC through the owner query parameter', async () => {
        await Promise.all([
          createConfiguration(supertestWithoutAuth, getConfigurationRequest(), 200, {
            user: obsSec,
            space: 'space1',
          }),
          createConfiguration(
            supertestWithoutAuth,
            { ...getConfigurationRequest(), owner: 'observabilityFixture' },
            200,
            {
              user: obsSec,
              space: 'space1',
            }
          ),
        ]);

        // User with permissions only to security solution request cases from observability
        const res = await getConfiguration({
          supertest: supertestWithoutAuth,
          query: { owner: ['securitySolutionFixture', 'observabilityFixture'] },
          auth: {
            user: secOnly,
            space: 'space1',
          },
        });

        // Only security solution cases are being returned
        ensureSavedObjectIsAuthorized(res, 1, ['securitySolutionFixture']);
      });
    });
  });
};
