// Central color constants — mirror tailwind.config.js so we can use them
// inline (badges, charts, dynamic styles) as well as via Tailwind classes.
export const COLORS = {
  navy: '#1B2B5E',
  accent: '#169DD1',
  light: '#BFEAF5',
  gold: '#C9A84C',
  bg: '#F8F9FB',
  ink: '#1A1A2E',
};

// Status -> badge styling for leads pipeline.
export const STATUS_META = {
  new: { label: 'New', bg: '#BFEAF5', text: '#1B2B5E' },
  contacted: { label: 'Contacted', bg: '#169DD1', text: '#FFFFFF' },
  demo_scheduled: { label: 'Demo Scheduled', bg: '#1B2B5E', text: '#FFFFFF' },
  proposal_sent: { label: 'Proposal Sent', bg: '#C9A84C', text: '#1A1A2E' },
  closed_won: { label: 'Closed Won', bg: '#1f9d55', text: '#FFFFFF' },
  closed_lost: { label: 'Closed Lost', bg: '#e3e6ec', text: '#6b7280' },
};

export const STATUS_ORDER = [
  'new',
  'contacted',
  'demo_scheduled',
  'proposal_sent',
  'closed_won',
  'closed_lost',
];

export const VERTICALS = ['restaurant', 'retail', 'healthcare', 'salon', 'gym', 'service'];

export const CALL_OUTCOMES = [
  { value: 'no_answer', label: 'No Answer' },
  { value: 'left_vm', label: 'Left Voicemail' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'callback_scheduled', label: 'Callback Scheduled' },
  { value: 'demo_booked', label: 'Demo Booked' },
  { value: 'statement_requested', label: 'Statement Requested' },
];

// When a call is logged, nudge the lead status forward.
export const OUTCOME_TO_STATUS = {
  callback_scheduled: 'contacted',
  demo_booked: 'demo_scheduled',
  statement_requested: 'contacted',
  left_vm: 'contacted',
  no_answer: 'contacted',
};
