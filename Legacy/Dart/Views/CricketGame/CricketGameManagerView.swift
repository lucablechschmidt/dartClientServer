//
//  CricketGameManagerView.swift
//  Dart
//
//  Created by Luca Blechschmidt on 25.01.25.
//

import SwiftUI
import OrderedCollections

struct CricketGameManagerView: View {
    @Binding var gameView: GameViews
    
    @State var gameProgress: GameViewStates = GameViewStates.gameSetUp
    
    @State var selectedPlayers: OrderedSet<Player> = []
    
    @State var gameCanStart: Bool = false
    
    var body: some View {
        if gameProgress == GameViewStates.gameSetUp {
            CricketGameSetUpView(gameView: $gameView, gameProgress: $gameProgress, players: $selectedPlayers, gameCanStart: $gameCanStart).onChange(of: gameProgress) {}
        }
        else if gameProgress == GameViewStates.gameInProgress || gameProgress == GameViewStates.gameVictory {
            if gameCanStart {
                let game = createGame()
                CricketGameView(game: game, gameView: $gameView, gameProgress: $gameProgress).environmentObject(game)
            }
        }
        else if gameProgress == GameViewStates.gameEnded {
            Text("end")
                .foregroundColor(Color("TextColor"))
        }
        
    }
    
    func createGame() -> CricketGame {
        return CricketGame(players: Array(selectedPlayers))
    }
}

#Preview {
    CricketGameManagerView(gameView: .constant(GameViews.ClassicGame))
}
