//
//  CricketGameInProgressView.swift
//  Dart
//
//  Created by Luca Blechschmidt on 27.01.25.
//

import SwiftUI

struct CricketGameInProgressView: View {
    @StateObject var game: Game
    
    @Binding var gameProgress: GameViewStates
    
    @State var refresh: Bool = false
    
    var body: some View {
        VStack {
            Spacer()
            CricketDetailView(game: game as! CricketGame, refresh: $refresh, players: game.players).environmentObject(game).onChange(of: refresh) {}
            Spacer()
            Text(game.currentPlayer.name)
                .frame(width: UIScreen.main.bounds.width / 1.1, height:  UIScreen.main.bounds.height / 30)
                .foregroundColor(Color("TextColor"))
                .background(Color.gray.opacity(0.5))
                .cornerRadius(18)
            DartScoreView(
                refresh: $refresh,
                dartThrow: getDartsScore(dartThrow: game.getPlayerLastDartThrow(playerId: game.currentPlayer.playerId)), faultyDartThrow: game.currentDartThrow.faulty)
            .padding(.bottom, 5)
            .onChange(of: refresh){}
            CricketScoreInputView(game: game, gameProgress: $gameProgress, refresh: $refresh).environmentObject(game).onChange(of: refresh) {}
        }
    }
    
    func getDartsScore(dartThrow: DartThrow) -> [SingleDartScoreForView] {
        
        let dartsThrown = dartThrow.darts.count
        
        var dartsScores: [SingleDartScoreForView] = []
        
        for i in 0..<3 {
            let isCurrentThrow: Bool = i == dartsThrown
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
    let cricketGame = createDummyCricketGame()
    
    CricketGameInProgressView(game: cricketGame, gameProgress: .constant(GameViewStates.gameInProgress)).environmentObject(cricketGame)
}
