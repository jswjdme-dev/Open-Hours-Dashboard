/**
 * events.ts
 * Domain events bus and single event interconnection path for Open Hours Console.
 * Every repository mutation emits an event, maintaining zero-disagreement single source of truth.
 */

export type DomainEventType =
  | 'client.changeRequested'
  | 'website.changesRequested'
  | 'ticket.created'
  | 'request.submitted'
  | 'suggestion.responded'
  | 'referral.pending'
  | 'lead.stageChanged'
  | 'lead.won'
  | 'lead.lost'
  | 'lead.notNow'
  | 'client.created'
  | 'client.approved'
  | 'client.rejected'
  | 'client.statusChanged'
  | 'payment.recorded'
  | 'task.created'
  | 'task.completed'
  | 'report.published'
  | 'partner.clientSubmitted'
  | 'partner.brandingUpdated'
  | 'credential.created'
  | 'credential.reset'
  | 'credential.disabled'
  | 'credential.loginAttempt';

export interface ClientChangeRequestedPayload {
  clientId: string;
  clientName?: string;
  changeType?: string;
  description: string;
  ownerId?: string;
  actor?: string;
}

export interface WebsiteChangesRequestedPayload {
  projectId?: string;
  demoId?: string;
  versionId?: string;
  clientId?: string;
  clientName?: string;
  feedback: string;
  ownerId?: string;
  actor?: string;
}

export interface TicketCreatedPayload {
  ticketId: string;
  clientId: string;
  clientName?: string;
  title: string;
  priority?: string;
  ownerId?: string;
  assignedTo?: string;
  actor?: string;
}

export interface RequestSubmittedPayload {
  requestId: string;
  clientId: string;
  clientName?: string;
  title: string;
  type?: string;
  priority?: string;
  ownerId?: string;
  actor?: string;
}

export interface SuggestionRespondedPayload {
  suggestionId: string;
  clientId: string;
  clientName?: string;
  title: string;
  action: 'Interested' | 'Not now' | 'Not for us' | 'Accepted';
  note?: string;
  ownerId?: string;
  actor?: string;
}

export interface ReferralPendingPayload {
  referralId: string;
  referrerClientId: string;
  referrerClientName?: string;
  referredClientName?: string;
  reward?: string;
  ownerId?: string;
  actor?: string;
}

export interface LeadStageChangedPayload {
  leadId: string;
  leadBusinessName: string;
  fromStage: string;
  toStage: string;
  details?: { lostReason?: string; notNowUntil?: string };
  channelId?: string;
  actor?: string;
}

export interface PaymentRecordedPayload {
  paymentId: string;
  clientId: string;
  clientName?: string;
  amount: number;
  status: string;
  actor?: string;
}

export interface DomainEvent<T = any> {
  id: string;
  type: DomainEventType;
  timestamp: string;
  payload: T;
  actor: string;
}

type EventHandler = (event: DomainEvent) => void;

class DomainEventBus {
  private handlers: Map<DomainEventType | '*', Set<EventHandler>> = new Map();
  private history: DomainEvent[] = [];
  private maxHistory = 200;

  public subscribe(type: DomainEventType | '*', handler: EventHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);

    return () => {
      this.handlers.get(type)?.delete(handler);
    };
  }

  public emit<T = any>(
    type: DomainEventType,
    payload: T,
    actor = 'system'
  ): DomainEvent<T> {
    const event: DomainEvent<T> = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      timestamp: new Date().toISOString(),
      payload,
      actor,
    };

    // Keep bounded history
    this.history.unshift(event);
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }

    // Notify specific type subscribers
    const specificHandlers = this.handlers.get(type);
    if (specificHandlers) {
      specificHandlers.forEach((h) => {
        try {
          h(event);
        } catch (err) {
          console.error(`Error in event handler for ${type}`, err);
        }
      });
    }

    // Notify wildcard subscribers
    const wildcardHandlers = this.handlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach((h) => {
        try {
          h(event);
        } catch (err) {
          console.error('Error in wildcard event handler', err);
        }
      });
    }

    // Dispatch DOM event for reactive components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('domainEventEmitted', { detail: event }));
    }

    return event;
  }

  public getHistory(): DomainEvent[] {
    return [...this.history];
  }

  public clearHistory(): void {
    this.history = [];
  }
}

export const eventBus = new DomainEventBus();

export function emitDomainEvent<T = any>(
  type: DomainEventType,
  payload: T,
  actor = 'system'
): DomainEvent<T> {
  return eventBus.emit(type, payload, actor);
}

export function subscribeDomainEvent(
  type: DomainEventType | '*',
  handler: (event: DomainEvent) => void
): () => void {
  return eventBus.subscribe(type, handler);
}

export function getDomainEventHistory(): DomainEvent[] {
  return eventBus.getHistory();
}

/**
 * Consistency Check Interface
 */
export interface ConsistencyCheckResult {
  id: string;
  name: string;
  description: string;
  status: 'PASS' | 'FAIL';
  details: string;
  timestamp: string;
}
