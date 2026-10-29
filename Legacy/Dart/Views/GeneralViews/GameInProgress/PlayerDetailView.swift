//
//  PlayerDetailView.swift
//  Dart
//
//  Created by Luca Blechschmidt on 25.01.25.
//

import SwiftUI

struct PlayerDetailView: View {
    @Binding var refresh: Bool
    
    @StateObject var game: Game
    
    let player: Player
    
    var body: some View {
        HStack {
            VStack {
                HStack {
                    Text("\(player.name)")
                        .font(.title)
                        .foregroundColor(Color.black)
                        .padding([.leading, .top], 15)
                    Spacer()
                    if game.currentPlayer.playerId != player.playerId && game.isFirtsDart() {
                        if game.players.count == 2 {
                            Button(action: {
                                game.switchStartingPlayer(player: player)
                                refresh.toggle()
                            }) {
                                Text("ToStart")
                                    .font(.callout)
                                    .padding(.top, 15)
                            }
                        }
                    }
                    Spacer()
                    Text("\(game.getPlayerScore(playerId: player.playerId))")
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(Color.black)
                        .padding([.trailing, .top], 15)
                }
                
                HStack {
                    Text("🎯")
                        .font(.callout)
                        .padding(.leading, 15)
                    Text("\(game.getPlayerDarts(playerId: player.playerId))")
                        .font(.callout)
                        .foregroundColor(Color.black)
                    Image(systemName: "circle.slash").foregroundColor(Color.black).font(.callout)
                    Text("\(game.getPlayerAverage(playerId: player.playerId), specifier: "%.2f")")
                        .font(.callout)
                        .foregroundColor(Color.black)
                    Spacer()
                }
                HStack {
                    Spacer()
                    DartScoreView(
                        refresh: $refresh,
                        dartThrow: getDartsScore(dartThrow: game.getPlayerLastDartThrow(playerId: player.playerId)),faultyDartThrow: game.currentDartThrow.faulty)
                    .onChange(of: refresh){}
                    .padding(.bottom, 25)
                    Spacer()
                }
            }
        }.frame(width: UIScreen.main.bounds.width - 15, height:  UIScreen.main.bounds.height / 6)
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
    
    func getDartsScore(dartThrow: DartThrow) -> [SingleDartScoreForView] {
        
        let dartsThrown = dartThrow.darts.count
        
        var dartsScores: [SingleDartScoreForView] = []
        
        for i in 0..<3 {
            let isCurrentThrow: Bool = ((i == dartsThrown) && player == game.currentPlayer)
            if i > dartsThrown {
                let scoreToAppend: SingleDartScoreForView = SingleDartScoreForView(isCurrentThrow: isCurrentThrow, singleDartThrowScore: SingleDartsScore(field: 0, scoreType: .unset))
                dartsScores.append(scoreToAppend)
            } else {
                let scoreToAppend: SingleDartScoreForView = SingleDartScoreForView(isCurrentThrow: isCurrentThrow, singleDartThrowScore: dartThrow.darts[i])
                dartsScores.append(scoreToAppend)
            }
        }
        return dartsScores
    }
}

#Preview {
    let classicGame = createDummyClassicGame(players: 3)
    let player = createDummyPlayer()
    
    PlayerDetailView(refresh: .constant(true), game: classicGame, player: player).environmentObject(classicGame)
}
