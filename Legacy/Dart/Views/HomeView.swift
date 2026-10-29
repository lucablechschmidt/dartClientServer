//
//  HomeView.swift
//  Dart
//
//  Created by Luca Blechschmidt on 25.01.25.
//

import SwiftUI

struct HomeView: View {
    
    @State private var selectedTab: Int = 1
    
    var body: some View {
        NavigationView{
            TabView(selection: $selectedTab){
                NewGameView()
                    .tabItem{
                        Label("New Game", systemImage: "gamecontroller")
                        //Text("New Game")
                    }
                    .tag(1)
                
                PlayersListView()
                    .tabItem{
                        Label("Players", systemImage: "person")
                    }
                    .foregroundColor(Color.black)
                    .tag(2)
            }.font(.system(size: 50))
        }
    }
}

#Preview {
    HomeView()
}
