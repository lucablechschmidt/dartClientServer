//
//  EliminationGameManagerView.swift
//  Dart
//
//  Created by Luca Blechschmidt on 29.01.25.
//

import SwiftUI
import OrderedCollections

struct EliminationGameManagerView: View {
    @Binding var gameView: GameViews
    
    @State var gameProgress: GameViewStates = GameViewStates.gameSetUp
    
    @State var outConstriction: GameTypeOut = GameTypeOut.SingleOut
    
    @State var selectedPlayers: OrderedSet<Player> = []
    @State var points: Int = 301
    
    @State var gameCanStart: Bool = false
    var body: some View {
        if gameProgress == GameViewStates.gameSetUp {
            EliminationGameSetUpView(gameView: $gameView, gameProgress: $gameProgress, players: $selectedPlayers, points: $points, outConstriction: $outConstriction, gameCanStart: $gameCanStart).onChange(of: gameProgress) {}
        }
        else if gameProgress == GameViewStates.gameInProgress || gameProgress == GameViewStates.gameVictory {
            if gameCanStart {
                let game = createGame()
                EliminationGameView(game: game, gameView: $gameView, gameProgress: $gameProgress, points: $points).environmentObject(game)
            }
        }
        else if gameProgress == GameViewStates.gameEnded {
            Text("end")
                .foregroundColor(Color("TextColor"))
        }
    }
    
    func createGame() -> EliminationGame {
        return EliminationGame(players: Array(selectedPlayers), finishPoints: points, outConstriction: outConstriction)
    }
}

#Preview {
    EliminationGameManagerView(gameView: .constant(GameViews.ClassicGame))
}
