//
//  MultiplayerView.swift
//  Dart
//
//  Created by Luca Blechschmidt on 27/07/2026.
//

import SwiftUI

struct MultiplayerView: View {
    @Binding var refresh: Bool
    
    @StateObject var game: Game
    var body: some View {
        PlayerDetailView(refresh: $refresh, game: game, player: game.currentPlayer)
            .onChange(of: refresh) {}
            .frame(height: UIScreen.main.bounds.height / 5)
        
        ScrollView(.horizontal, showsIndicators: false) {
            HStack {
                ForEach(game.players, id: \.self){ player in
                    PlayerSmallDetailView(refresh: $refresh, game: game, player: player)
                        .onChange(of: refresh) {}
                        .padding([.leading, .trailing], 5)
                }
            }.padding(.all, 5)
        }.frame(height: UIScreen.main.bounds.height / 5)
    }
}

#Preview {
    let classicGame = createDummyClassicGame(players: 4)
    
    MultiplayerView(refresh: .constant(true), game: classicGame).environmentObject(classicGame)
}
