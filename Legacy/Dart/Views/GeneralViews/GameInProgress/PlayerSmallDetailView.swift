//
//  PlayerSmallDetailView.swift
//  Dart
//
//  Created by Luca Blechschmidt on 27/07/2026.
//

import SwiftUI

struct PlayerSmallDetailView: View {
    @Binding var refresh: Bool
    
    @StateObject var game: Game
    
    let player: Player
        
    var body: some View {
        VStack {
            HStack {
                Spacer()
                Text("\(player.name.prefix(5))")
                    .font(.title)
                    .fontWeight(.regular)
                    .foregroundColor(Color.black)
                Spacer()
            }
            HStack {
                Spacer()
                Text("\(game.getPlayerScore(playerId: player.playerId))")
                    .font(.title)
                    .fontWeight(.bold)
                    .foregroundColor(Color.black)
                Spacer()
            }
        }.frame(width: UIScreen.main.bounds.width / 3, height:  UIScreen.main.bounds.height / 9)
            .foregroundColor(Color("FrameForeground"))
            .background(Color("FrameBackground"))
            .cornerRadius(18)
            .overlay(border())
        
    }
    
    func border() -> some View {
        let isPlaying = player == game.currentPlayer
        return isPlaying ? RoundedRectangle(cornerRadius: 18)
            .stroke(Color.blue, lineWidth: 3) : RoundedRectangle(cornerRadius: 18)
            .stroke(Color("FrameForeground"), lineWidth: 3)
    }
}

#Preview {
    let classicGame = createDummyClassicGame(players: 3)
    let player = createDummyPlayer()
    
    PlayerSmallDetailView(refresh: .constant(true), game: classicGame, player: player).environmentObject(classicGame)
}
