/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ProgramItem {
  id: string;
  time: string;
  title: string;
  location: string;
  description: string;
}

export interface CandleItem {
  id: number;
  name: string;
  relationship: string;
  tribute: string;
  lit: boolean;
}

export interface SymbolItem {
  id: number;
  name: string;
  meaning: string;
  description: string;
  iconName: string;
}

