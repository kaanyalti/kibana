/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserFields } from '@kbn/timelines-plugin/common';
import { EMPTY_BROWSER_FIELDS } from '@kbn/timelines-plugin/common';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import type { RuntimeFieldSpec, RuntimePrimitiveTypes } from '@kbn/data-views-plugin/common';

/** Uniquely identifies a Sourcerer Scope */
export enum SourcererScopeName {
  default = 'default',
  detections = 'detections',
  timeline = 'timeline',
  analyzer = 'analyzer',
  explore = 'explore',
}

/**
 * Data related to each sourcerer scope
 */
export interface SourcererScope {
  /** Uniquely identifies a Sourcerer Scope */
  id: SourcererScopeName;
  /** is an update being made to the sourcerer data view */
  loading: boolean;
  /** selected data view id, null if it is legacy index patterns*/
  selectedDataViewId: string | null;
  /** selected patterns within the data view */
  selectedPatterns: string[];
  /** if has length,
   * id === SourcererScopeName.timeline
   * selectedDataViewId === null OR defaultDataView.id
   * saved timeline has pattern that is not in the default */
  missingPatterns: string[];
}

export type SourcererScopeById = Record<SourcererScopeName, SourcererScope>;

export interface KibanaDataView {
  /** Uniquely identifies a Kibana Data View */
  id: string;
  /**  list of active patterns that return data  */
  patternList: string[];
  /**
   * title of Kibana Data View
   * title also serves as "all pattern list", including inactive
   * comma separated string
   */
  title: string;
}

export type RunTimeMappings =
  | Record<string, Omit<RuntimeFieldSpec, 'type'> & { type: RuntimePrimitiveTypes }>
  | undefined;

/**
 * DataView from Kibana + timelines/index_fields enhanced field data
 */
export interface SourcererDataView extends KibanaDataView {
  id: string;
  /**
   * @deprecated
   * determines how we can use the field in the app
   * aggregatable, searchable, type, example
   * category, description, format
   * indices the field is included in etc*/
  browserFields: BrowserFields;
  fields: DataViewSpec['fields'] | undefined;
  /** set when data view fields are fetched */
  loading: boolean;
  /**
   * @type DataView @kbn/data-views-plugin/common
   */
  dataView: DataViewSpec | undefined;
}

/**
 * Combined data from SourcererDataView and SourcererScope to create
 * selected data view state
 */
export interface SelectedDataView {
  /**
   * @deprecated use EcsFlat or fields / indexFields from data view
   */
  browserFields: BrowserFields;
  dataViewId: string | null; // null if legacy pre-8.0 timeline
  /** do the selected indices exist  */
  indicesExist: boolean;
  /** is an update being made to the data view */
  loading: boolean;
  /* all selected patterns from SourcererScope['selectedPatterns'] */
  selectedPatterns: SourcererScope['selectedPatterns'];
  /**
   * Easier to add this additional data rather than
   * try to extend the SelectedDataView type from DataView.
   */
  sourcererDataView: DataViewSpec;
}

/**
 * sourcerer model for redux
 */
export interface SourcererModel {
  /** default security-solution data view */
  defaultDataView: SourcererDataView & { id: string; error?: unknown };
  /** default security-solution alert data view */
  alertDataView: SourcererDataView & { id: string; error?: unknown };
  /** all Kibana data views, including security-solution */
  kibanaDataViews: SourcererDataView[];
  /** security solution signals index name */
  signalIndexName: string | null;
  /** security solution signal index mapping state */
  signalIndexMappingOutdated: boolean | null;
  /** sourcerer scope data by id */
  sourcererScopes: SourcererScopeById;
}

export type SourcererUrlState = Partial<{
  [id in SourcererScopeName]: {
    id: string;
    selectedPatterns: string[];
  };
}>;

export const initSourcererScope: Omit<SourcererScope, 'id'> = {
  loading: false,
  selectedDataViewId: null,
  selectedPatterns: [],
  missingPatterns: [],
};

export const initDataView: SourcererDataView & { id: string; error?: unknown } = {
  browserFields: EMPTY_BROWSER_FIELDS,
  id: '',
  fields: undefined,
  loading: false,
  patternList: [],
  title: '',
  dataView: undefined,
};

export const initialSourcererState: SourcererModel = {
  defaultDataView: initDataView,
  alertDataView: initDataView,
  kibanaDataViews: [],
  signalIndexName: null,
  signalIndexMappingOutdated: null,
  sourcererScopes: {
    [SourcererScopeName.default]: {
      ...initSourcererScope,
      id: SourcererScopeName.default,
    },
    [SourcererScopeName.detections]: {
      ...initSourcererScope,
      id: SourcererScopeName.detections,
    },
    [SourcererScopeName.timeline]: {
      ...initSourcererScope,
      id: SourcererScopeName.timeline,
    },
    [SourcererScopeName.analyzer]: {
      ...initSourcererScope,
      id: SourcererScopeName.analyzer,
    },
    [SourcererScopeName.explore]: {
      ...initSourcererScope,
      id: SourcererScopeName.explore,
    },
  },
};
