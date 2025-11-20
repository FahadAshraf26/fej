import { Subscription, SubscriptionStatusInfo } from '../types/Subscription';

// Flexible subscription interface that works with both types
interface FlexibleSubscription {
  is_active: boolean;
  status: string;
  canceled_at?: string | null;
  cancel_at?: string | null;
  trial_activated?: boolean;
  trial_end_date?: string | null;
  plans?: {
    features?: {
      type?: string;
      tier?: string;
    };
  };
}

export class SubscriptionService {
  /**
   * Check if a subscription is considered active (includes both active and trialing statuses)
   */
  static isSubscriptionActive(subscription: FlexibleSubscription): boolean {
    return subscription.is_active && 
           (subscription.status === 'active' || subscription.status === 'trialing') &&
           !subscription.canceled_at && 
           !subscription.cancel_at;
  }

  /**
   * Check if a subscription is in trialing state
   */
  static isTrialing(subscription: FlexibleSubscription): boolean {
    return subscription.status === 'trialing' && 
           !!subscription.trial_activated && 
           !!subscription.trial_end_date;
  }

  /**
   * Check if a subscription is canceled
   */
  static isCanceled(subscription: FlexibleSubscription): boolean {
    return subscription.status === 'canceled' || 
           !!subscription.canceled_at || 
           !!subscription.cancel_at;
  }

  /**
   * Check if a subscription has payment issues
   */
  static hasPaymentIssues(subscription: FlexibleSubscription): boolean {
    return subscription.status === 'past_due' || 
           subscription.status === 'incomplete' || 
           subscription.status === 'incomplete_expired' ||
           subscription.status === 'failed' ||
           subscription.status === 'unpaid';
  }

  /**
   * Get comprehensive subscription status for a user
   */
  static getSubscriptionStatus(subscriptions: FlexibleSubscription[], isFlapjack: boolean): SubscriptionStatusInfo {
    if (isFlapjack) {
      return {
        isActive: true,
        isTrialing: false,
        isCanceled: false,
        isPastDue: false,
        hasPaymentIssues: false,
        shouldShowBanner: false,
        canAccessFeatures: true,
      };
    }

    const activeSubscription = subscriptions.find(sub => this.isSubscriptionActive(sub));
    const trialingSubscription = subscriptions.find(sub => this.isTrialing(sub));
    const canceledSubscription = subscriptions.find(sub => this.isCanceled(sub));
    const paymentIssueSubscription = subscriptions.find(sub => this.hasPaymentIssues(sub));

    const isActive = !!activeSubscription;
    const isTrialing = !!trialingSubscription;
    const isCanceled = !!canceledSubscription;
    const hasPaymentIssues = !!paymentIssueSubscription;

    return {
      isActive,
      isTrialing,
      isCanceled,
      isPastDue: hasPaymentIssues,
      hasPaymentIssues,
      shouldShowBanner: !isActive && !isTrialing,
      canAccessFeatures: isActive || isTrialing,
    };
  }

  /**
   * Check if user has any active subscription (legacy method for backward compatibility)
   */
  static hasActiveSubscription(subscriptions: FlexibleSubscription[]): boolean {
    return subscriptions.some(sub => this.isSubscriptionActive(sub));
  }

  /**
   * Check if a subscription is an Editor subscription
   */
  static isEditorSubscription(subscription: FlexibleSubscription): boolean {
    return subscription.plans?.features?.type === 'editor';
  }

  /**
   * Check if a subscription is a Design subscription
   */
  static isDesignSubscription(subscription: FlexibleSubscription): boolean {
    return subscription.plans?.features?.type === 'design';
  }

  /**
   * Check if user has any active Editor subscription
   */
  static hasActiveEditorSubscription(subscriptions: FlexibleSubscription[]): boolean {
    return subscriptions.some(sub => this.isEditorSubscription(sub) && this.isSubscriptionActive(sub));
  }

  /**
   * Check if user has any active Design subscription
   */
  static hasActiveDesignSubscription(subscriptions: FlexibleSubscription[]): boolean {
    return subscriptions.some(sub => this.isDesignSubscription(sub) && this.isSubscriptionActive(sub));
  }

  /**
   * Check if user has any subscriptions (Editor or Design, any status)
   */
  static hasAnySubscriptions(subscriptions: FlexibleSubscription[]): boolean {
    return subscriptions.some(sub => 
      this.isEditorSubscription(sub) || this.isDesignSubscription(sub)
    );
  }

  /**
   * Get Editor subscription status for access control with restaurant-level override support
   */
  static getEditorSubscriptionStatus(
    subscriptions: FlexibleSubscription[], 
    isFlapjack: boolean,
    restaurantOverride?: boolean
  ): SubscriptionStatusInfo {
    if (isFlapjack) {
      return {
        isActive: true,
        isTrialing: false,
        isCanceled: false,
        isPastDue: false,
        hasPaymentIssues: false,
        shouldShowBanner: false,
        canAccessFeatures: true,
      };
    }

    // Check if restaurant has subscription override enabled
    if (restaurantOverride) {
      // With override, check for any active subscription (design or editor)
      const hasAnyActiveSubscription = this.hasActiveSubscription(subscriptions);
      
      if (hasAnyActiveSubscription) {
        return {
          isActive: true,
          isTrialing: false,
          isCanceled: false,
          isPastDue: false,
          hasPaymentIssues: false,
          shouldShowBanner: false,
          canAccessFeatures: true,
        };
      }
    }

    // Filter to only Editor subscriptions (original logic)
    const editorSubscriptions = subscriptions.filter(sub => this.isEditorSubscription(sub));

    const activeEditorSubscription = editorSubscriptions.find(sub => this.isSubscriptionActive(sub));
    const trialingEditorSubscription = editorSubscriptions.find(sub => this.isTrialing(sub));
    const canceledEditorSubscription = editorSubscriptions.find(sub => this.isCanceled(sub));
    const paymentIssueEditorSubscription = editorSubscriptions.find(sub => this.hasPaymentIssues(sub));

    const isActive = !!activeEditorSubscription;
    const isTrialing = !!trialingEditorSubscription;
    const isCanceled = !!canceledEditorSubscription;
    const hasPaymentIssues = !!paymentIssueEditorSubscription;

    return {
      isActive,
      isTrialing,
      isCanceled,
      isPastDue: hasPaymentIssues,
      hasPaymentIssues,
      shouldShowBanner: !isActive && !isTrialing,
      canAccessFeatures: isActive || isTrialing,
    };
  }
}
