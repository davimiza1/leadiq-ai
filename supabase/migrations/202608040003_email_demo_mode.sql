alter table public.lead_emails drop constraint if exists lead_emails_status_check;
alter table public.lead_emails add constraint lead_emails_status_check
  check (status in ('demo', 'sent', 'delivered', 'bounced', 'failed'));
