//
//  CustomTabBarButton.swift
//  Dart
//
//  Created by Luca Blechschmidt on 11.04.25.
//

import SwiftUI

struct CustomTabBarButton: View {
    @Binding var selectedTab: Tabs
    
    var tab: Tabs
    
    var label: String
    var icon: String
    
    var body: some View {
        Button(action: {
            selectedTab = tab
        }) {
            GeometryReader{ geo in
                if selectedTab == tab {
                    Rectangle()
                        .foregroundColor(Color.blue)
                        .frame(width: geo.size.width/2, height: 4)
                        .padding(.leading, geo.size.width/4)
                }
                
                VStack(alignment: .center, spacing: 4.0) {
                    Image(systemName: icon)
                        .resizable()
                        .scaledToFit()
                        .frame(width: 24, height: 24)
                    Text(label)
                }
                .frame(width: geo.size.width, height: geo.size.height)
            }
            
        }.tint(Color.gray)
    }
}

#Preview {
    var label: String = "Games"
    var icon: String = "gamecontroller"
    
    //CustomTabBarButton(selectedTabIndex: .constant(Tabs.games), label: label, icon: icon)
    CustomTabBar(selectedTab: .constant(Tabs.games))
}
