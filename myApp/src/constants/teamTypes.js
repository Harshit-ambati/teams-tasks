export const TEAM_TYPES = [
  { value: 'engineering', label: 'Engineering', badgeClass: 'type-engineering' },
  { value: 'design', label: 'Design', badgeClass: 'type-design' },
  { value: 'marketing', label: 'Marketing', badgeClass: 'type-marketing' },
  { value: 'product', label: 'Product', badgeClass: 'type-product' },
  { value: 'operations', label: 'Operations', badgeClass: 'type-operations' },
];

export const DEFAULT_TEAM_TYPE = TEAM_TYPES[0].value;
export const ALL_TEAM_TYPES = 'all';

export const TEAM_TYPE_MAP = TEAM_TYPES.reduce((acc, teamType) => {
  acc[teamType.value] = teamType;
  return acc;
}, {});

export const isValidTeamType = (type) => Boolean(TEAM_TYPE_MAP[type]);

export const getTeamTypeMeta = (type) =>
  TEAM_TYPE_MAP[type] || {
    value: DEFAULT_TEAM_TYPE,
    label: 'Engineering',
    badgeClass: 'type-engineering',
  };
