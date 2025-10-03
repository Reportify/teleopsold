// VLT-style Team Name Generation Utility
import { format } from "date-fns";

export interface TeamLeader {
  id: number;
  username?: string;
  first_name: string;
  last_name: string;
  employee_id?: string;
}

/**
 * Generates a VLT-style team name based on team leader and creation date/time
 * Format: {team_leader.username}-{DD-MMM-YY-HHMM}
 * If username is not available, uses first name or employee_id as fallback
 */
export const generateVLTTeamName = (teamLeader: TeamLeader, creationDate: Date = new Date()): string => {
  // Use username if available, otherwise fallback to first name or employee_id
  const leaderIdentifier = teamLeader.username || teamLeader.first_name || teamLeader.employee_id || `User${teamLeader.id}`;

  // Format date and time as DD-MMM-YY-HHMM (e.g., 15-Jan-25-1430)
  const formattedDateTime = format(creationDate, "dd-MMM-yy-HHmm");

  return `${leaderIdentifier}-${formattedDateTime}`;
};

/**
 * Generates a unique VLT-style team name by checking against existing team names
 * Adds a counter suffix if the base name already exists
 */
export const generateUniqueVLTTeamName = (teamLeader: TeamLeader, existingTeamNames: string[], creationDate: Date = new Date()): string => {
  const baseName = generateVLTTeamName(teamLeader, creationDate);

  // Check if base name is unique
  if (!existingTeamNames.includes(baseName)) {
    return baseName;
  }

  // Add counter suffix for uniqueness
  let counter = 1;
  let uniqueName = `${baseName}-${counter}`;

  while (existingTeamNames.includes(uniqueName)) {
    counter++;
    uniqueName = `${baseName}-${counter}`;
  }

  return uniqueName;
};

/**
 * Extracts team information from a VLT-style team name
 * Returns the leader identifier and creation date/time if parseable
 */
export const parseVLTTeamName = (teamName: string): { leaderIdentifier?: string; dateTimeStr?: string; counter?: number } => {
  // Pattern: {leader}-{DD-MMM-YY-HHMM} or {leader}-{DD-MMM-YY-HHMM}-{counter}
  const match = teamName.match(/^(.+)-(\d{2}-[A-Za-z]{3}-\d{2}-\d{4})(?:-(\d+))?$/);

  if (!match) {
    // Fallback: try old format without time for backward compatibility
    const oldMatch = teamName.match(/^(.+)-(\d{2}-[A-Za-z]{3}-\d{2})(?:-(\d+))?$/);
    if (oldMatch) {
      return {
        leaderIdentifier: oldMatch[1],
        dateTimeStr: oldMatch[2], // Keep as dateTimeStr for consistency
        counter: oldMatch[3] ? parseInt(oldMatch[3], 10) : undefined,
      };
    }
    return {};
  }

  return {
    leaderIdentifier: match[1],
    dateTimeStr: match[2],
    counter: match[3] ? parseInt(match[3], 10) : undefined,
  };
};

/**
 * Validates if a team name follows VLT naming convention
 */
export const isVLTTeamName = (teamName: string): boolean => {
  const parsed = parseVLTTeamName(teamName);
  return !!(parsed.leaderIdentifier && parsed.dateTimeStr);
};
