/**
 * Sales Rep Mapping Utility
 * Maps email addresses and phone numbers to their corresponding Slack IDs
 */

interface SalesRepMapping {
  email: string;
  phone?: string;
  slackId: string;
}

const SALES_REP_MAPPINGS: SalesRepMapping[] = [
  {
    email: "Wonga@flapjack.co",
    slackId: "U09HV89R4BE"
  },
  {
    email: "Brian@flapjack.co", 
    phone: "+27676619758",
    slackId: "U09HV87BV7W"
  },
  {
    email: "Dylan@flapjack.co",
    phone: "(415) 320 1298",
    slackId: "U05QJJ289PD"
  },
  {
    email: "quinton@flapjack.co",
    slackId: "U09JJ8VRCUX"
  },
  {
    email: "skye@flapjack.co",
    slackId: "U09MK242X5Y"
  }
];

/**
 * Maps an email address to a sales rep Slack ID
 * @param email - The email address to look up
 * @returns The corresponding Slack ID or fallback Slack ID if not found
 */
export function getSalesRepSlackIdByEmail(email: string): string {
  if (!email) {
    return 'U045Q9R1T8R';
  }
  
  const normalizedEmail = email.toLowerCase().trim();
  
  const mapping = SALES_REP_MAPPINGS.find(rep => 
    rep.email.toLowerCase().trim() === normalizedEmail
  );
  
  return mapping?.slackId || 'U045Q9R1T8R';
}

/**
 * Maps a phone number to a sales rep Slack ID
 * @param phone - The phone number to look up
 * @returns The corresponding Slack ID or fallback Slack ID if not found
 */
export function getSalesRepSlackIdByPhone(phone: string): string {
  if (!phone) {
    return 'U045Q9R1T8R';
  }
  
  // Normalize phone number by removing all non-digit characters
  const normalizedPhone = phone.replace(/\D/g, '');
  
  const mapping = SALES_REP_MAPPINGS.find(rep => {
    if (!rep.phone) return false;
    
    // Normalize the stored phone number
    const normalizedRepPhone = rep.phone.replace(/\D/g, '');
    
    // Check if the normalized phone numbers match
    return normalizedRepPhone === normalizedPhone;
  });
  
  return mapping?.slackId || 'U045Q9R1T8R';
}

/**
 * Maps either an email or phone number to a sales rep Slack ID
 * @param email - The email address to look up
 * @param phone - The phone number to look up
 * @returns The corresponding Slack ID or fallback Slack ID if not found
 */
export function getSalesRepSlackId(email?: string, phone?: string): string {
  // Try email first
  if (email) {
    const slackIdByEmail = getSalesRepSlackIdByEmail(email);
    if (slackIdByEmail) {
      return slackIdByEmail;
    }
  }
  
  // Try phone if email didn't match
  if (phone) {
    const slackIdByPhone = getSalesRepSlackIdByPhone(phone);
    if (slackIdByPhone) {
      return slackIdByPhone;
    }
  }
  
  return 'U045Q9R1T8R';
}
