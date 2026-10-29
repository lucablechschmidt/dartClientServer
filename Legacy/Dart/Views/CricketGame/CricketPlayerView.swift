//
//  CricketPlayerView.swift
//  Dart
//
//  Created by Luca Blechschmidt on 29.01.25.
//

import SwiftUI

struct CricketPlayerView: View {
    let playerName: String
    let score: Int
    
    var body: some View {
        VStack {
            Text(playerName)
            Text("\(score)")
        }
        .foregroundColor(Color.black)
        .padding(.all, 5.0)
        .background(Color("FrameBackground"))
        .cornerRadius(15)
    }
}

#Preview {
    let player = createDummyPlayer()
    let score = 0
    CricketPlayerView(playerName:player.name, score: score)
}
