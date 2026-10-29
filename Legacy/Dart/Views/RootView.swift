//
//  RootView.swift
//  Dart
//
//  Created by Luca Blechschmidt on 11.04.25.
//

import SwiftUI

struct RootView: View {
    @State var selectedTabIndex: Tabs = Tabs.games
    var body: some View {
        VStack {
            Text(/*@START_MENU_TOKEN@*/"Hello, World!"/*@END_MENU_TOKEN@*/)
            Spacer()
            CustomTabBar(selectedTab: $selectedTabIndex)
        }
    }
}

#Preview {
    RootView()
}
