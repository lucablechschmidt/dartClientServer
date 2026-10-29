//
//  SplitScoreGameManagerView.swift
//  Dart
//
//  Created by Luca Blechschmidt on 29.01.25.
//

import SwiftUI
import OrderedCollections

struct SplitScoreGameManagerView: View {
    @Binding var gameView: GameViews
    
    @State var gameProgress: GameViewStates = GameViewStates.gameSetUp
    
    @State var selectedPlayers: OrderedSet<Player> = []
    
    @State var gameCanStart: Bool = false
    var body: some View {
        if gameProgress == GameViewStates.gameSetUp {
            SplitScoreGameSetUpView(gameView: $gameView, gameProgress: $gameProgress, players: $selectedPlayers, gameCanStart: $gameCanStart).onChange(of: gameProgress) {}
        }
        else if gameProgress == GameViewStates.gameInProgress || gameProgress == GameViewStates.gameVictory {
            if gameCanStart {
                let game = createGame()
                SplitScoreGameView(game: game, gameView: $gameView, gameProgress: $gameProgress).environmentObject(game)
            }
        }
        else if gameProgress == GameViewStates.gameEnded {
            Text("end")
                .foregroundColor(Color("TextColor"))
        }
    }
    
    func createGame() -> SplitScoreGame {
        return SplitScoreGame(players: Array(selectedPlayers))
    }
}

#Preview {
    SplitScoreGameManagerView(gameView: .constant(GameViews.ClassicGame))
}
