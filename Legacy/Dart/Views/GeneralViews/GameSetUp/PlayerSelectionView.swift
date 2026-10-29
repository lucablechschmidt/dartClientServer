//
//  PlayerSelectionView.swift
//  Dart
//
//  Created by Luca Blechschmidt on 25.01.25.
//

import SwiftUI
import OrderedCollections
import SwiftData

struct PlayerSelectionView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: [.init(\Player.timestamp)], animation: .bouncy) private var players: [Player]
    
    @Binding var selectedPlayers: OrderedSet<Player>

    var body: some View {
        List {
            ForEach(players){ player in
                HStack {
                    Text(player.name)
                        .font(.callout)
                        .foregroundColor(Color("TextColor"))
                    Spacer()
                    if selectedPlayers.contains(player) {
                        Text("\(getPlayerIndex(player)+1)")
                            .overlay(Image(systemName: "circle"))
                    }
                    
                    Image(systemName: selectedPlayers.contains(player) ? "checkmark.circle" : "circle")
                        .foregroundColor(Color("TextColor"))
                        .onTapGesture {
                            if selectedPlayers.contains(player) {
                                selectedPlayers.remove(player)
                            } else {
                                let i = selectedPlayers.endIndex
                                selectedPlayers.insert(player, at: i)
                            }
                        }
                }
            }
        }
    }
    
    func getPlayerIndex(_ player: Player) -> Int {
        return selectedPlayers.firstIndex(of: player)!
    }
}

#Preview {
    let selectedPlayers: OrderedSet<Player> = createDummyPlayerSet()
    
    PlayerSelectionView(selectedPlayers: .constant(selectedPlayers))
        .modelContainer(for: Player.self, inMemory: true)
}
