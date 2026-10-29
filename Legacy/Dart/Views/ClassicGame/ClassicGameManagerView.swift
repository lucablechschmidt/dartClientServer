//
//  ClassicGameManagerView.swift
//  Dart
//
//  Created by Luca Blechschmidt on 25.01.25.
//

import SwiftUI
import OrderedCollections

struct ClassicGameManagerView: View {
    @Binding var gameView: GameViews
    
    @State var gameProgress: GameViewStates = GameViewStates.gameSetUp
    
    @State var selectedPlayers: OrderedSet<Player> = []
    @State var points: Int = 501
    
    @State var isShowingClassicGamePopover: Bool = false
    @State var isShowingCricketPopover: Bool = false
    
    @State var inConstriction: GameTypeIn = GameTypeIn.SingleIn
    @State var outConstriction: GameTypeOut = GameTypeOut.DoubleOut
    
    @State var setsToWinGame: Int = 1
    @State var legsToWinSet: Int = 1
    
    @State var gameCanStart: Bool = false
    
    var body: some View {
        if gameProgress == GameViewStates.gameSetUp {
            ClassicGameSetUpView(gameView: $gameView, gameProgress: $gameProgress, players: $selectedPlayers, points: $points, inConstriction: $inConstriction, outConstriction: $outConstriction, setsToWinGame: $setsToWinGame, legsToWinSet: $legsToWinSet, gameCanStart: $gameCanStart).onChange(of: gameCanStart) {}
        }
        else if gameProgress == GameViewStates.gameInProgress || gameProgress == GameViewStates.gameVictory {
            if gameCanStart {
                let game = createGame()
                ClassicGameView(game: game, gameView: $gameView, gameProgress: $gameProgress, gameStartPoints: $points).environmentObject(game)
            }
        }
        else if gameProgress == GameViewStates.gameEnded {
            Text("end")
                .foregroundColor(Color("TextColor"))
        }
    }
    
    func createGame() -> ClassicGame {
        let gameType: GameType = GameType(inConstriction: inConstriction, outConstriction: outConstriction)
        return createClassicGame(players: Array(selectedPlayers), gameType: gameType, pointsToWinLeg: points, setsToWinGame: setsToWinGame, legsToWinSet: legsToWinSet)
    }
    
}

#Preview {
    ClassicGameManagerView(gameView: .constant(GameViews.ClassicGame), gameProgress: GameViewStates.gameSetUp)
}
