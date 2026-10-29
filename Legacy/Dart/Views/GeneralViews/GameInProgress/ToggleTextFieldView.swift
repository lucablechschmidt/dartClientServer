//
//  ToggleTextFieldView.swift
//  Dart
//
//  Created by Luca Blechschmidt on 28/09/2026.
//

import SwiftUI

struct ToggleTextFieldView: View {
    @StateObject var game: ClassicGame
    @Binding var refresh: Bool
    let player: Player
    
    @State var toggle: Bool = true
    var body: some View {
        VStack {
            if toggle {
                Text("\(game.getPlayerDartAverage(playerId: player.playerId), specifier: "%.2f")")
            } else {
                Text("\(game.getPlayerAverage(playerId: player.playerId), specifier: "%.2f")")
            }
        }.font(.title2)
            .foregroundColor(Color.black)
            .onTapGesture {
                toggle.toggle()
                refresh.toggle()
            }
    }
}

#Preview {
    let classicGame = createDummyClassicGame(players: 3)
    
    let dummyPlayer = createDummyPlayer()
    
    ToggleTextFieldView(game: classicGame, refresh: .constant(true), player: dummyPlayer).environmentObject(classicGame)
    
}
