//
//  Tournament.swift
//  Dart
//
//  Created by Luca Blechschmidt on 18.03.25.
//

import Foundation

struct Match: Hashable {
    let team1: String
    let team2: String
    var round: Int
}

func generateTournamentSchedule(teams: [String]) -> [Match] {
    var matches: [Match] = []
    let teamCount = teams.count
    let rounds = teamCount - 1
    var schedule: [[Match]] = Array(repeating: [], count: rounds)
    
    // Generate all matches (round-robin)
    for i in 0..<teamCount {
        for j in (i+1)..<teamCount {
            matches.append(Match(team1: teams[i], team2: teams[j], round: -1))
        }
    }
    
    // Shuffle matches for initial randomness
    matches.shuffle()
    
    var assignedMatches = Set<Match>()
    
    // Assign matches to rounds ensuring balanced breaks
    for round in 0..<rounds {
        var roundMatches: [Match] = []
        var usedTeams: Set<String> = []
        
        for match in matches where match.round == -1 {
            if !usedTeams.contains(match.team1) && !usedTeams.contains(match.team2) {
                var newMatch = match
                newMatch.round = round
                roundMatches.append(newMatch)
                usedTeams.insert(match.team1)
                usedTeams.insert(match.team2)
            }
        }
        
        // Store the round matches
        schedule[round] = roundMatches
        
        // Mark matches as scheduled
        for match in roundMatches {
            if let index = matches.firstIndex(where: { $0.team1 == match.team1 && $0.team2 == match.team2 }) {
                matches[index].round = round
                assignedMatches.insert(matches[index])
            }
        }
    }
    
    return matches.sorted(by: { $0.round < $1.round })  // Sort by round order
}
