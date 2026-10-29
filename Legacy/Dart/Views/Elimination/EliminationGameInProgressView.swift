//
//  EliminationGameInProgressView.swift
//  Dart
//
//  Created by Luca Blechschmidt on 29.01.25.
//

import SwiftUI

struct EliminationGameInProgressView: View {
    @StateObject var game: EliminationGame
    
    @Binding var gameProgress: GameViewStates
    
    @State var refresh: Bool = false
    var body: some View {
        VStack {
            VStack {
                if(game.players.count <= 2) {
                    // Elimination Game two players
                    ForEach(game.players, id: \.self){ player in
                        PlayerDetailView(refresh: $refresh, game: game, player: player)
                            .padding()
                            .frame(height: UIScreen.main.bounds.height / 15 * 3)
                            .onChange(of: refresh) {}
                    }
                } else {
                    MultiplayerView(refresh: $refresh, game: game)
                    /*ScrollView {
                        ForEach(game.players, id: \.self){ player in
                            PlayerDetailView(refresh: $refresh, game: game, player: player)
                                .frame(height: UIScreen.main.bounds.height / 15 * 3)
                                .onChange(of: refresh) {}
                        }
                    }*/
                }
            }
            Spacer()
            Text("Points to eliminate: \(game.getNextEleminationPoints())")
                .font(.body)
                .frame(width: UIScreen.main.bounds.width / 1.1, height:  UIScreen.main.bounds.height / 30)
                .foregroundColor(Color.white)
                .background(Color.gray.opacity(0.5))
                .cornerRadius(18)
            
            ScoreInputView(gameProgress: $gameProgress, refresh: $refresh).environmentObject(game as Game).onChange(of: refresh) {}
        }
    }
    
    func canCheckout() -> Bool {
        let darts = 3 - game.currentDartThrow.darts.count
        
        let scoreToCheck = game.finishPoints - game.getPlayerScore(playerId: game.currentPlayer.playerId)
        if( darts == 3) {
            return (dartsCheckoutsThreeDarts[scoreToCheck] != nil) ? true : false
        }else if( darts == 2) {
            return (dartsCheckoutsTwoDarts[scoreToCheck] != nil) ? true : false
        }else if( darts == 1) {
            return (dartsCheckoutsSingleDart[scoreToCheck] != nil) ? true : false
        }
        return false
    }
}

#Preview {
    let eliminationGame = createDummyEliminationGame()
    
    EliminationGameInProgressView(game: eliminationGame, gameProgress: .constant(GameViewStates.gameInProgress)).environmentObject(eliminationGame)
}
