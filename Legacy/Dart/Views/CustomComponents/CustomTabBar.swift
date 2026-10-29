//
//  CustomTabBar.swift
//  Dart
//
//  Created by Luca Blechschmidt on 11.04.25.
//

import SwiftUI

enum Tabs: Int, CaseIterable {
    case games = 0
    case players = 1
}

struct CustomTabBar: View {
    @Binding var selectedTab: Tabs
    
    var body: some View {
        HStack{
            CustomTabBarButton(selectedTab: $selectedTab, tab: Tabs.games, label: "Games", icon: "gamecontroller")
            CustomTabBarButton(selectedTab: $selectedTab, tab: Tabs.players, label: "Players", icon: "person")
        }.frame(height: 82)
    }
}

#Preview {
    CustomTabBar(selectedTab: .constant(Tabs.games))
}
