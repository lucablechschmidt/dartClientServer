//
//  CricketDetailView.swift
//  Dart
//
//  Created by Luca Blechschmidt on 29.01.25.
//

import SwiftUI

struct CricketDetailView: View {
    @StateObject var game: CricketGame
    
    @Binding var refresh: Bool
    
    let players: [Player]
    
    var body: some View {
        HStack(alignment: .bottom, spacing: 0) {
            VStack {
                Text(" ")
                Text(" ")
                ForEach(CricketFields.allCases, id: \.self) { cricketField in
                    if(cricketField == CricketFields.zero) {} else {
                        Divider().background(Color.black).frame(width: UIScreen.main.bounds.width/4 - 2)
                        Text(cricketField.title)
                            .foregroundColor(Color.black)
                            .frame(width: UIScreen.main.bounds.width/4 - 4, height: UIScreen.main.bounds.height/30)
                            .background(getBackground(cricketField)).cornerRadius(5)
                    }
                }
            }
            
            ScrollView(.horizontal) {
                HStack(spacing: 5) {
                    ForEach(players, id: \.self) { player in
                        VStack {
                            CricketPlayerView(playerName: player.name, score: game.playerScores[player.playerId]!)
                            ForEach(CricketFields.allCases, id: \.self) { cricketField in
                                if(cricketField == CricketFields.zero) {} else {
                                    Divider().background(Color.black)
                                        .frame(width: UIScreen.main.bounds.width/4 - 2)
                                    Text(getFieldHits(player: player, field: cricketField))
                                        .foregroundColor(Color.black)
                                        .frame(width: UIScreen.main.bounds.width/4 - 2, height: UIScreen.main.bounds.height/30)
                                        .background(getBackground(cricketField)).cornerRadius(5)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    func getBackground(_ field: CricketFields) -> Color {
        return game.fields[field]!.isClosed ? Color("CricketFieldClosed") : Color("FrameBackground")
    }
    
    func getFieldHits(player: Player, field: CricketFields) -> String {
        var hits: String = ""
        let numberOfHits: Int = game.fields[field]!.playersFieldHits[player.playerId]?.count ?? 0
        if numberOfHits >= 3 {
            return "XXX"
        }
        for _ in 0..<numberOfHits {
            hits += "X"
        }
        return hits
    }
}

#Preview {
    let cricketGame = createDummyCricketGame()
    
    let players = cricketGame.players
    
    CricketDetailView(game: cricketGame, refresh: .constant(true), players: players).environmentObject(cricketGame)
}
