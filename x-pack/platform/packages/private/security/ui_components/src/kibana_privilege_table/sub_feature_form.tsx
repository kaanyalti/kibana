/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonGroup,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiText,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import { i18n } from '@kbn/i18n';
import type {
  SecuredSubFeature,
  SubFeaturePrivilege,
  SubFeaturePrivilegeGroup,
} from '@kbn/security-role-management-model';

import { NO_PRIVILEGE_VALUE } from '../constants';
import type { PrivilegeFormCalculator } from '../privilege_form_calculator';

interface Props {
  featureId: string;
  subFeature: SecuredSubFeature;
  selectedFeaturePrivileges: string[];
  privilegeCalculator: PrivilegeFormCalculator;
  privilegeIndex: number;
  onChange: (selectedPrivileges: string[]) => void;
  disabled?: boolean;
  categoryId?: string;
  allSpacesSelected?: boolean;
}

export const SubFeatureForm = (props: Props) => {
  const groupsWithPrivileges = props.subFeature.getPrivilegeGroups();
  const subFeatureNameTestId = useMemo(() => {
    // Removes anything that is not a Number, Letter or space and replaces it with _
    return props.subFeature.name.toLowerCase().replace(/[^\w\d]/g, '_');
  }, [props.subFeature.name]);
  const getTestId = useCallback(
    (suffix: string = '') => {
      return `${props.categoryId ? `${props.categoryId}_` : ''}${
        props.featureId
      }_${subFeatureNameTestId}${suffix ? `_${suffix}` : ''}`;
    },
    [props.categoryId, props.featureId, subFeatureNameTestId]
  );

  const getTooltip = () => {
    if (!props.subFeature.privilegesTooltip) {
      return null;
    }
    const tooltipContent = (
      <EuiText>
        <p>{props.subFeature.privilegesTooltip}</p>
      </EuiText>
    );
    return (
      <EuiIconTip
        iconProps={{
          className: 'eui-alignTop',
        }}
        type="info"
        color="subdued"
        content={tooltipContent}
        anchorProps={{ 'data-test-subj': getTestId('nameTooltip') }}
      />
    );
  };

  if (groupsWithPrivileges.length === 0) {
    return null;
  }
  return (
    <EuiFlexGroup alignItems="center" data-test-subj={getTestId()}>
      <EuiFlexItem grow={3}>
        <EuiFlexGroup gutterSize="none" direction="column">
          <EuiFlexItem>
            <EuiText size="s" data-test-subj={getTestId('name')}>
              {props.subFeature.name} {getTooltip()}
            </EuiText>
          </EuiFlexItem>
          {props.subFeature.description && (
            <EuiFlexItem>
              <EuiText
                color={'subdued'}
                size={'xs'}
                data-test-subj="subFeatureDescription"
                aria-describedby={`${props.subFeature.name} description text`}
              >
                {props.subFeature.description}
              </EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={2} data-test-subj={getTestId('privilegeGroup')}>
        {groupsWithPrivileges.map(renderPrivilegeGroup)}
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  function renderPrivilegeGroup(privilegeGroup: SubFeaturePrivilegeGroup, index: number) {
    switch (privilegeGroup.groupType) {
      case 'independent':
        return renderIndependentPrivilegeGroup(privilegeGroup, index);
      case 'mutually_exclusive':
        return renderMutuallyExclusivePrivilegeGroup(privilegeGroup, index);
      default:
        throw new Error(`Unsupported privilege group type: ${privilegeGroup.groupType}`);
    }
  }

  function renderIndependentPrivilegeGroup(
    privilegeGroup: SubFeaturePrivilegeGroup,
    index: number
  ) {
    return (
      <div key={index}>
        {privilegeGroup.privileges.map((privilege: SubFeaturePrivilege) => {
          const isGranted = props.privilegeCalculator.isIndependentSubFeaturePrivilegeGranted(
            props.featureId,
            privilege.id,
            props.privilegeIndex
          );
          return (
            <EuiCheckbox
              key={privilege.id}
              id={`${props.featureId}_${privilege.id}`}
              label={privilege.name}
              data-test-subj="independentSubFeaturePrivilegeControl"
              onChange={(e) => {
                const { checked } = e.target;
                if (checked) {
                  props.onChange([...props.selectedFeaturePrivileges, privilege.id]);
                } else {
                  props.onChange(
                    props.selectedFeaturePrivileges.filter((sp) => sp !== privilege.id)
                  );
                }
              }}
              checked={isGranted}
              disabled={props.disabled}
            />
          );
        })}
      </div>
    );
  }

  function renderMutuallyExclusivePrivilegeGroup(
    privilegeGroup: SubFeaturePrivilegeGroup,
    index: number
  ) {
    const nonePrivilege = {
      id: NO_PRIVILEGE_VALUE,
      label: 'None',
      isDisabled: props.disabled,
    };

    const firstSelectedPrivilege =
      props.privilegeCalculator.getSelectedMutuallyExclusiveSubFeaturePrivilege(
        props.featureId,
        privilegeGroup,
        props.privilegeIndex
      ) ?? nonePrivilege;

    const options = [
      ...privilegeGroup.privileges.map((privilege, privilegeIndex) => {
        return {
          id: privilege.id,
          label: privilege.name,
          isDisabled: props.disabled,
        };
      }),
    ];

    options.push(nonePrivilege);

    const idSelected =
      props.subFeature.requireAllSpaces && !props.allSpacesSelected
        ? nonePrivilege.id
        : firstSelectedPrivilege.id;

    return (
      <EuiButtonGroup
        key={index}
        buttonSize="compressed"
        data-test-subj="mutexSubFeaturePrivilegeControl"
        isFullWidth
        options={options}
        idSelected={idSelected}
        isDisabled={props.disabled}
        onChange={(selectedPrivilegeId: string) => {
          // Deselect all privileges which belong to this mutually-exclusive group
          const privilegesWithoutGroupEntries = props.selectedFeaturePrivileges.filter(
            (sp) => !privilegeGroup.privileges.some((privilege) => privilege.id === sp)
          );
          // fire on-change with the newly selected privilege
          if (selectedPrivilegeId === NO_PRIVILEGE_VALUE) {
            props.onChange(privilegesWithoutGroupEntries);
          } else {
            props.onChange([...privilegesWithoutGroupEntries, selectedPrivilegeId]);
          }
        }}
        legend={i18n.translate(
          'xpack.security.management.editRole.subFeatureForm.controlLegendText',
          {
            defaultMessage: '{subFeatureName} sub-feature privilege',
            values: {
              subFeatureName: props.subFeature.name,
            },
          }
        )}
      />
    );
  }
};
