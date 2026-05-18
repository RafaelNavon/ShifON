export const BATCH_STATUSES = [
  'approved',
  'skew_ptm',
  'skew',
  'disqualified',
  'bacterial_contamination',
  'c_ptb',
  'ptm',
  'reext',
  'awaiting_response',
]

export const BATCH_STATUS_LABEL = {
  approved: 'Approved',
  skew_ptm: 'Skew PTM',
  skew: 'Skew',
  disqualified: 'Disqualified',
  bacterial_contamination: 'Bacterial Contamination',
  c_ptb: 'C PTB',
  ptm: 'PTM',
  reext: 'Re-ext',
  awaiting_response: 'Awaiting Response',
}

export const BATCH_STATUS_COLOR = {
  approved: 'status-approved',
  skew_ptm: 'status-skew',
  skew: 'status-skew',
  disqualified: 'status-rejected',
  bacterial_contamination: 'status-rejected',
  c_ptb: 'status-neutral',
  ptm: 'status-neutral',
  reext: 'status-neutral',
  awaiting_response: 'status-neutral',
}

export const DEFAULT_BATCH_STATUS = 'skew_ptm'

export const RED_STATUSES = ['disqualified', 'bacterial_contamination']
