//
//  PlayersListView.swift
//  Dart
//
//  Created by Luca Blechschmidt on 25.01.25.
//

import SwiftUI
import UIKit
import SwiftData

struct PlayersListView: View {
    @Environment(\.modelContext) private var modelContext
    
    @Query(sort: [.init(\Player.timestamp)], animation: .bouncy) private var players: [Player]
    
    @State var editPlayer: Bool = false
    @State var editedPlayer: Player? = nil
    @State var addPlayer: Bool = false
    @FocusState private var focusTextField: Bool
    
    @State var editPlayerName: String = ""
    @State var newPlayerName: String = ""
    @State var newPlayerEmoji: String = ""
    
    var body: some View {
        VStack(spacing: 15) {
            List {
                HStack {
                    Spacer()
                    VStack {
                        if(addPlayer) {
                            HStack{
                                TextField("Name", text: $newPlayerName)
                                    .focused($focusTextField)
                                    .textFieldStyle(.roundedBorder)
                                    .foregroundColor(Color("TextColor"))
                                    .onSubmit {
                                        if !newPlayerName.isEmpty {
                                            addPlayer(newPlayerName)
                                            newPlayerName = ""
                                        }
                                        addPlayer = false
                                        focusTextField = false
                                    }
                            }
                        } else {
                            Button(action: {
                                addPlayer.toggle()
                                focusTextField.toggle()
                            }) {
                                Text("AddPlayer")
                            }
                        }
                    }
                    Spacer()
                }
                ForEach(players) { player in
                    HStack{
                        VStack {
                            if(editPlayer && player == editedPlayer) {
                                TextField(player.name, text: $editPlayerName)
                                    .focused($focusTextField)
                                    .textFieldStyle(.roundedBorder)
                                    .onSubmit {
                                        if !editPlayerName.isEmpty {
                                            editedPlayer!.name = editPlayerName
                                            editPlayerName = ""
                                        }
                                        editPlayer = false
                                        focusTextField = false
                                        editedPlayer = nil
                                    }
                            } else {
                                Text(player.name)
                            }
                        }
                        Spacer()
                        Image(systemName: "wrench")
                            .onTapGesture {
                            editPlayer.toggle()
                            focusTextField.toggle()
                            editedPlayer = player
                        }
                    }
                }.onDelete(perform: deletePlayer)
            }.font(.title2)
                .foregroundColor(Color.black)
                .padding(.all, 25)
                .cornerRadius(15)
        }.cornerRadius(25)
    }
    
    private func addPlayer(_ name: String) {
        let newPlayer = Player(name: name)
        modelContext.insert(newPlayer)
    }
    
    private func deletePlayer(offsets: IndexSet) {
        for index in offsets {
            modelContext.delete(players[index])
        }
    }
}

#Preview {
    PlayersListView().modelContainer(for: Player.self, inMemory: true)
}
