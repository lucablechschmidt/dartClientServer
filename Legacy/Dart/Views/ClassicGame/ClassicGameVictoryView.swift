//
//  VictoryView.swift
//  Dart
//
//  Created by Luca Blechschmidt on 25.01.25.
//

import SwiftUI


struct ClassicGameVictoryView: View{
    @StateObject var game: ClassicGame
    
    @Binding var gameProgress: GameViewStates
    @Binding var gameStartPoints: Int
    
    @State var refresh: Bool = false
    var body: some View{
        VStack {
            Text("You Win! \(game.currentPlayer.name)")
                .font(.title)
                .fontWeight(.semibold)
                .foregroundColor(Color("TextColor"))
            HStack {
                Text("🎯")
                    .font(.title2)
                    .padding(.leading, 15)
                Text("\(game.getPlayerDarts(playerId: game.currentPlayer.playerId))")
                    .font(.title2)
                    .foregroundColor(Color.black)
                Spacer().frame(width: 15)
                Text("-")
                    .font(.title2)
                    .foregroundColor(Color.black)
                Spacer().frame(width: 15)
                Image(systemName: "circle.slash")
                    .font(.title2)
                    .foregroundColor(Color.black)
                ToggleTextFieldView(game: game, refresh: $refresh, player: game.currentPlayer)
                /*Text("\(game.getPlayerDartAverage(playerId: game.currentPlayer.playerId), specifier: "%.2f")")
                    .font(.title2)
                    .foregroundColor(Color.black)*/
            }
        }
        
        VStack {
            ForEach(game.getPlayersSortedScore(), id: \.self) { playerId in
                let player = game.players.first(where: {$0.playerId == playerId})!
                if player != game.currentPlayer{
                    HStack{
                        Text("\(player.name): \(game.playerScores[player.playerId]!) - ")
                        ToggleTextFieldView(game: game, refresh: $refresh, player: player)
                    }.font(.title3)
                        .fontWeight(.semibold)
                        .foregroundColor(Color("TextColor"))
                }
            }
            /*ForEach(game.players, id: \.self){ player in
                Text("\(player.name): \(game.playerScores[player.playerId]!)")
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundColor(Color("TextColor"))
            }*/
        }.padding(1)
        Button(action: {
            game.removeWinningDart()
            gameProgress = GameViewStates.gameInProgress
            game.gameHasEnded = false
        }) {
            Text("Letzten Wurf rückgängig machen")
                .font(.title2)
                .foregroundColor(Color("TextColor"))
        }
        Button(action: {
            game.restart(gameStartPoints: gameStartPoints)
            gameProgress = GameViewStates.gameInProgress
            game.gameHasEnded = false
        }) {
            Text("Restart Game")
                .font(.title2)
                .foregroundColor(Color("TextColor"))
        }
        Text("EndGame").font(.title2).onTapGesture {
            gameProgress = GameViewStates.gameSetUp
            game.gameHasEnded = true
        }
    }
}

#Preview {
    let classicGame = createDummyClassicGame(players: 3)
    
    ClassicGameVictoryView(game: classicGame, gameProgress: .constant(GameViewStates.gameVictory), gameStartPoints:  .constant(501)).environmentObject(classicGame)
}
