//
//  ClassicGameInProgressView.swift
//  Dart
//
//  Created by Luca Blechschmidt on 25.01.25.
//

import SwiftUI

struct ClassicGameInProgressView: View {
    @StateObject var game: Game
    
    @Binding var gameProgress: GameViewStates
    
    @State var refresh: Bool = false
    
    var body: some View {
        VStack {
            VStack {
                if(game.players.count <= 2) {
                    // Classic Game two players
                    ForEach(game.players, id: \.self){ player in
                        PlayerDetailView(refresh: $refresh, game: game, player: player)
                            .frame(height: UIScreen.main.bounds.height / 5)
                            .onChange(of: refresh) {}
                    }
                } else {
                    MultiplayerView(refresh: $refresh, game: game)
                }
            }.frame(height: UIScreen.main.bounds.height * 2 / 5)
            
            VStack(spacing: 5) {
                if(canCheckout()) {
                    CheckoutView(refresh: $refresh, score: game.getPlayerScore(playerId: game.currentPlayer.playerId), darts: 3 - game.currentDartThrow.darts.count).onChange(of: refresh) {}
                } else {
                    Spacer().frame(width: UIScreen.main.bounds.width * 5 / 6 + 20, height:  UIScreen.main.bounds.height / 30)
                }
                ScoreInputView(gameProgress: $gameProgress, refresh: $refresh).environmentObject(game).onChange(of: refresh) {}
            }.frame(height:  UIScreen.main.bounds.height * 2 / 5)
        }
    }
    
    func canCheckout() -> Bool {
        let darts = 3 - game.currentDartThrow.darts.count
        
        let score = game.getPlayerScore(playerId: game.currentPlayer.playerId)
        if( darts == 3) {
            return (dartsCheckoutsThreeDarts[score] != nil) ? true : false
        }else if( darts == 2) {
            return (dartsCheckoutsTwoDarts[score] != nil) ? true : false
        }else if( darts == 1) {
            return (dartsCheckoutsSingleDart[score] != nil) ? true : false
        }
        return false
    }
    
}

struct CheckoutView: View {
    @Binding var refresh: Bool
    
    let score: Int
    
    let darts: Int
    
    var body: some View {
        Text((getCheckoutCount(score: score, darts: darts)))
            .font(.callout)
            .frame(width: UIScreen.main.bounds.width * 5 / 6 + 20, height:  UIScreen.main.bounds.height / 30)
            .foregroundColor(Color.white)
            .background(Color.gray.opacity(0.5))
            .cornerRadius(18)
    }
    
    func getCheckoutCount(score: Int, darts: Int) -> String {
        if( darts == 3) {
            return dartsCheckoutsThreeDarts[score]?.first ?? ""
        }else if( darts == 2) {
            return dartsCheckoutsTwoDarts[score]?.first ?? ""
        }else if( darts == 1) {
            return dartsCheckoutsSingleDart[score]?.first ?? ""
        }
        
        return ""
    }
}

#Preview {
    let classicGame = createDummyClassicGame(players: 2)
    
    ClassicGameInProgressView(game: classicGame, gameProgress: .constant(GameViewStates.gameInProgress))
        .environmentObject(classicGame)
}
