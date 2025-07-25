/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';

import {
  EuiPage,
  EuiPageBody,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiPanel,
  UseEuiTheme,
} from '@elastic/eui';
import { kbnFullBodyHeightCss } from '@kbn/css-utils/public/full_body_height_css';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { css } from '@emotion/react';
import {
  SearchProfilerTabs,
  ProfileTree,
  HighlightDetailsFlyout,
  LicenseWarningNotice,
  ProfileLoadingPlaceholder,
  EmptyTreePlaceHolder,
  ProfileQueryEditor,
} from './components';

import { useAppContext, useProfilerActionContext, useProfilerReadContext } from './contexts';
import { hasAggregations, hasSearch } from './lib';
import { Targets } from './types';

const componentStyles = {
  appRoot: ({ euiTheme }: UseEuiTheme) =>
    css([
      {
        overflow: 'hidden',
        flexShrink: 1,
      }, // adding dev tool top bar to the body offset
      kbnFullBodyHeightCss(`(${euiTheme.size.base} * 3)`),
    ]),
};

export const App = () => {
  const { getLicenseStatus, notifications } = useAppContext();

  const { activeTab, currentResponse, highlightDetails, pristine, profiling } =
    useProfilerReadContext();

  const dispatch = useProfilerActionContext();

  const handleProfileTreeError = (e: Error) => {
    notifications.addError(e, {
      title: i18n.translate('xpack.searchProfiler.profileTreeErrorRenderTitle', {
        defaultMessage: 'Profile data cannot be parsed.',
      }),
    });
  };

  const setActiveTab = useCallback(
    (target: Targets) => dispatch({ type: 'setActiveTab', value: target }),
    [dispatch]
  );

  const onHighlight = useCallback(
    (value: any) => dispatch({ type: 'setHighlightDetails', value }),
    [dispatch]
  );

  const renderLicenseWarning = () => {
    return !getLicenseStatus().valid ? (
      <>
        <LicenseWarningNotice />
        <EuiSpacer size="s" />
      </>
    ) : null;
  };

  const renderProfileTreeArea = () => {
    if (profiling) {
      return <ProfileLoadingPlaceholder />;
    }

    if (activeTab) {
      return (
        <ProfileTree
          onDataInitError={handleProfileTreeError}
          onHighlight={onHighlight}
          target={activeTab}
          data={currentResponse}
        />
      );
    }

    if (getLicenseStatus().valid && pristine) {
      return <EmptyTreePlaceHolder />;
    }

    return null;
  };

  const styles = useMemoCss(componentStyles);

  return (
    <>
      <EuiPage className="prfDevTool__page" css={styles.appRoot}>
        <EuiPageBody className="prfDevTool__page__pageBody">
          {renderLicenseWarning()}
          <EuiPanel className="prfDevTool__page__pageBodyContent">
            <EuiFlexGroup
              responsive={false}
              gutterSize="s"
              direction="row"
              className="prfDevTool__page__bodyGroup"
            >
              <EuiFlexItem>
                <ProfileQueryEditor />
              </EuiFlexItem>
              <EuiFlexItem grow={3}>
                <EuiFlexGroup className="prfDevTool__main" gutterSize="none" direction="column">
                  <SearchProfilerTabs
                    activeTab={activeTab}
                    activateTab={setActiveTab}
                    has={{
                      aggregations: Boolean(currentResponse && hasAggregations(currentResponse)),
                      searches: Boolean(currentResponse && hasSearch(currentResponse)),
                    }}
                  />
                  {renderProfileTreeArea()}
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
            {highlightDetails ? (
              <HighlightDetailsFlyout
                {...highlightDetails}
                onClose={() => dispatch({ type: 'setHighlightDetails', value: null })}
              />
            ) : null}
          </EuiPanel>
        </EuiPageBody>
      </EuiPage>
    </>
  );
};
