//
//  SplitScoreGameInProgressView.swift
//  Dart
//
//  Created by Luca Blechschmidt on 29.01.25.
//

import SwiftUI

struct SplitScoreGameInProgressView: View {
    @StateObject var game: SplitScoreGame
    
    @Binding var gameProgress: GameViewStates
    
    @State var refresh: Bool = false
    var body: some View {
        VStack {
            VStack {
                if(game.players.count <= 2) {
                    // SplitScore Game two players
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
                ShootAtView(fieldToShootAt: game.currentFieldToHit.title, refresh: $refresh)
                
                ScoreInputView(gameProgress: $gameProgress, refresh: $refresh).environmentObject(game).onChange(of: refresh) {}
            }.frame(height:  UIScreen.main.bounds.height * 2 / 5)
        }
    }
}

struct ShootAtView: View {
    let fieldToShootAt: String
    
    @Binding var refresh: Bool
    var body: some View {
        Text("Shoot at \(fieldToShootAt)")
            .font(.callout)
            .frame(width: UIScreen.main.bounds.width * 5 / 6 + 20, height:  UIScreen.main.bounds.height / 30)
            .foregroundColor(Color.white)
            .background(Color.gray.opacity(0.5))
            .cornerRadius(18)
    }
}

#Preview {
    let splitScore = createDummySplitScoreGame()
    
    SplitScoreGameInProgressView(game: splitScore, gameProgress: .constant(GameViewStates.gameInProgress)).environmentObject(splitScore)
}
