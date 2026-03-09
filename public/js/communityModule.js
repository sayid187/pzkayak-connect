/**
 * Community & Matching Module
 * Handles friend location sharing, real-time location display, group fishing trip creation, and nearby fisher matching
 */

const communityModule = {
    // User data
    currentUser: {
        id: 'user_001',
        name: 'Username',
        avatar: null,
        coordinates: [36.0671, 120.3826],
        preferences: {
            fishingType: 'Sea Fishing',
            experienceLevel: 'Intermediate',
            favoriteLocations: []
        }
    },
    
    // Friends list
    friends: [
        {
            id: 'user_002',
            name: 'Fisher Alex',
            avatar: null,
            coordinates: [36.0700, 120.3900],
            status: 'online',
            distance: 2.5
        },
        {
            id: 'user_003',
            name: 'Fisher Blake',
            avatar: null,
            coordinates: [36.0750, 120.3950],
            status: 'online',
            distance: 5.8
        },
        {
            id: 'user_004',
            name: 'Fisher Chris',
            avatar: null,
            coordinates: [36.0800, 120.4000],
            status: 'online',
            distance: 8.3
        }
    ],
    
    // Nearby fishers
    nearbyFishers: [
        {
            id: 'user_005',
            name: 'Fisher Dana',
            avatar: null,
            coordinates: [36.0680, 120.3850],
            distance: 3.2,
            preferences: {
                fishingType: 'Sea Fishing',
                experienceLevel: 'Advanced'
            }
        },
        {
            id: 'user_006',
            name: 'Fisher Ellis',
            avatar: null,
            coordinates: [36.0690, 120.3870],
            distance: 4.5,
            preferences: {
                fishingType: 'Freshwater Fishing',
                experienceLevel: 'Intermediate'
            }
        }
    ],
    
    // Group activities
    groupActivities: [
        {
            id: 'activity_001',
            title: 'Weekend Sea Fishing',
            description: 'Join us for a sea fishing session near the pier',
            date: '2025-07-26',
            time: '08:00',
            location: 'Near the Coastal Pier',
            coordinates: [36.0600, 120.3800],
            organizer: 'user_002',
            participants: ['user_002', 'user_003', 'user_004', 'user_007', 'user_008'],
            status: 'ongoing',
            maxParticipants: 10
        },
        {
            id: 'activity_002',
            title: 'Beginner Kayak Fishing Class',
            description: 'Basic kayak fishing techniques for beginners',
            date: '2025-08-05',
            time: '14:00',
            location: 'Olympic Sailing Center',
            coordinates: [36.0500, 120.3900],
            organizer: 'user_002',
            participants: ['user_002', 'user_009', 'user_010', 'user_011', 'user_012', 'user_013'],
            status: 'upcoming',
            maxParticipants: 15
        }
    ],
    
    // Map related
    map: null,
    markers: [],
    
    init() {
        this.setupMap();
        this.setupEventListeners();
        this.updateFriendList();
        this.updateNearbyFishers();
        this.updateGroupActivities();
    },
    
    setupMap() {
        const container = document.getElementById('community-map');
        if (!container) return;

        const cargarMapa = (lat, lng) => {
            this.currentUser.coordinates = [lat, lng];
            container.innerHTML = `<iframe 
                src="https://maps.google.com/maps?q=${lat},${lng}&z=14&output=embed&hl=es"
                style="width:100%;height:100%;border:none;border-radius:0.75rem"
                allowfullscreen loading="lazy">
            </iframe>`;
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => cargarMapa(pos.coords.latitude, pos.coords.longitude),
                ()    => cargarMapa(this.currentUser.coordinates[0], this.currentUser.coordinates[1])
            );
        } else {
            cargarMapa(this.currentUser.coordinates[0], this.currentUser.coordinates[1]);
        }
    },
    
    setupEventListeners() {
        const refreshBtn = document.querySelector('#community-page .text-primary.text-sm');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshLocations());
        }
        
        const friendLocationBtns = document.querySelectorAll('#community-page .fa-map-marker');
        friendLocationBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const friendItem = e.target.closest('.flex.items-center');
                if (friendItem) {
                    const friendName = friendItem.querySelector('.font-medium').textContent;
                    this.showFriendLocation(friendName);
                }
            });
        });
        
        const friendMessageBtns = document.querySelectorAll('#community-page .fa-comment');
        friendMessageBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const friendItem = e.target.closest('.flex.items-center');
                if (friendItem) {
                    const friendName = friendItem.querySelector('.font-medium').textContent;
                    this.sendMessage(friendName);
                }
            });
        });
        
        const addFriendBtns = document.querySelectorAll('#community-page .btn.btn-primary.text-sm');
        addFriendBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const fisherItem = e.target.closest('.flex.items-center');
                if (fisherItem) {
                    const fisherName = fisherItem.querySelector('.font-medium').textContent;
                    this.addFriend(fisherName);
                }
            });
        });
        
        const joinActivityBtns = document.querySelectorAll('#community-page .btn.btn-secondary.text-sm');
        joinActivityBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const activityItem = e.target.closest('.p-3.bg-gray-50');
                if (activityItem) {
                    const activityTitle = activityItem.querySelector('h3').textContent;
                    this.joinActivity(activityTitle);
                }
            });
        });
        
        const createActivityBtn = document.querySelector('#community-page .btn.btn-primary.text-sm');
        if (createActivityBtn) {
            createActivityBtn.addEventListener('click', () => this.createActivity());
        }
    },
    
    addUserMarker() {
        // Handled by Google Maps embed
    },
    
    addFriendMarkers() {
        // Handled by Google Maps embed
    },
    
    updateFriendList() {
        const friendListContainer = document.querySelector('#community-page .space-y-3');
        if (!friendListContainer) return;
        
        friendListContainer.innerHTML = '';
        
        this.friends.forEach(friend => {
            const avatarInitial = friend.name.charAt(0);
            const avatarColors = ['bg-blue-100 text-primary', 'bg-green-100 text-secondary', 'bg-orange-100 text-accent'];
            const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];
            
            const friendItem = document.createElement('div');
            friendItem.className = 'flex items-center p-2 bg-gray-50 rounded-lg';
            friendItem.innerHTML = `
                <div class="w-10 h-10 ${avatarColor} rounded-full flex items-center justify-center mr-3">
                    <span class="font-bold">${avatarInitial}</span>
                </div>
                <div class="flex-1">
                    <p class="font-medium">${friend.name}</p>
                    <p class="text-sm text-gray-600">${friend.status === 'online' ? 'Online' : 'Offline'} · ${friend.distance} km away</p>
                </div>
                <div class="flex space-x-2">
                    <button class="text-primary friend-location" data-name="${friend.name}">
                        <i class="fa fa-map-marker"></i>
                    </button>
                    <button class="text-primary friend-message" data-name="${friend.name}">
                        <i class="fa fa-comment"></i>
                    </button>
                </div>
            `;
            
            friendItem.querySelector('.friend-location').addEventListener('click', () => this.showFriendLocation(friend.name));
            friendItem.querySelector('.friend-message').addEventListener('click', () => this.sendMessage(friend.name));
            
            friendListContainer.appendChild(friendItem);
        });
        
        if (this.friends.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'text-center py-4 text-gray-500';
            emptyMessage.textContent = 'No friends yet — add some from Nearby Fishers!';
            friendListContainer.appendChild(emptyMessage);
        }
    },
    
    updateNearbyFishers() {
        const nearbyContainer = document.querySelector('#community-page .space-y-3:last-child');
        if (!nearbyContainer) return;
        
        nearbyContainer.innerHTML = '';
        
        this.nearbyFishers.forEach(fisher => {
            const avatarInitial = fisher.name.charAt(0);
            const avatarColors = ['bg-purple-100 text-purple-600', 'bg-red-100 text-red-600', 'bg-yellow-100 text-yellow-600'];
            const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];
            
            const fisherItem = document.createElement('div');
            fisherItem.className = 'flex items-center p-2 bg-gray-50 rounded-lg';
            fisherItem.innerHTML = `
                <div class="w-10 h-10 ${avatarColor} rounded-full flex items-center justify-center mr-3">
                    <span class="font-bold">${avatarInitial}</span>
                </div>
                <div class="flex-1">
                    <p class="font-medium">${fisher.name}</p>
                    <p class="text-sm text-gray-600">${fisher.distance} km away · Likes ${fisher.preferences.fishingType}</p>
                </div>
                <button class="btn btn-primary text-sm add-friend" data-name="${fisher.name}">
                    Add Friend
                </button>
            `;
            
            fisherItem.querySelector('.add-friend').addEventListener('click', () => this.addFriend(fisher.name));
            nearbyContainer.appendChild(fisherItem);
        });
        
        if (this.nearbyFishers.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'text-center py-4 text-gray-500';
            emptyMessage.textContent = 'No nearby fishers found';
            nearbyContainer.appendChild(emptyMessage);
        }
    },
    
    updateGroupActivities() {
        const activityContainer = document.querySelector('#community-page .space-y-3:nth-child(2)');
        if (!activityContainer) return;
        
        activityContainer.innerHTML = '';
        
        this.groupActivities.forEach(activity => {
            const date = new Date(activity.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            const participantCount = activity.participants.length;
            let participantAvatars = '';
            
            for (let i = 0; i < Math.min(3, participantCount); i++) {
                const avatarColors = ['bg-blue-100 text-primary', 'bg-green-100 text-secondary', 'bg-orange-100 text-accent'];
                participantAvatars += `
                    <div class="w-8 h-8 ${avatarColors[i % avatarColors.length]} rounded-full flex items-center justify-center border-2 border-white">
                        <span class="text-xs font-bold">${String.fromCharCode(65 + i)}</span>
                    </div>
                `;
            }
            
            if (participantCount > 3) {
                participantAvatars += `
                    <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center border-2 border-white">
                        <span class="text-xs font-bold text-gray-600">+${participantCount - 3}</span>
                    </div>
                `;
            }
            
            const statusClass = activity.status === 'ongoing' ? 'bg-blue-100 text-primary' : 'bg-gray-100 text-gray-600';
            const statusText = activity.status === 'ongoing' ? 'Ongoing' : 'Upcoming';
            
            const activityItem = document.createElement('div');
            activityItem.className = 'p-3 bg-gray-50 rounded-lg';
            activityItem.innerHTML = `
                <div class="flex items-center justify-between mb-2">
                    <h3 class="font-medium">${activity.title}</h3>
                    <span class="text-xs ${statusClass} px-2 py-1 rounded-full">${statusText}</span>
                </div>
                <p class="text-sm text-gray-600 mb-2">Date: ${date} ${activity.time}</p>
                <p class="text-sm text-gray-600 mb-2">Location: ${activity.location}</p>
                <div class="flex items-center justify-between">
                    <div class="flex -space-x-2">${participantAvatars}</div>
                    <button class="btn btn-secondary text-sm join-activity" data-title="${activity.title}">Join</button>
                </div>
            `;
            
            activityItem.querySelector('.join-activity').addEventListener('click', () => this.joinActivity(activity.title));
            activityContainer.appendChild(activityItem);
        });
        
        if (this.groupActivities.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'text-center py-4 text-gray-500';
            emptyMessage.textContent = 'No group activities yet — create one!';
            activityContainer.appendChild(emptyMessage);
        }
    },
    
    refreshLocations() {
        const refreshBtn = document.querySelector('#community-page .text-primary.text-sm');
        if (refreshBtn) {
            const originalText = refreshBtn.innerHTML;
            refreshBtn.innerHTML = '<i class="fa fa-spinner fa-spin mr-1"></i> Refreshing...';
            refreshBtn.disabled = true;
            
            setTimeout(() => {
                this.currentUser.coordinates = [
                    this.currentUser.coordinates[0] + (Math.random() - 0.5) * 0.01,
                    this.currentUser.coordinates[1] + (Math.random() - 0.5) * 0.01
                ];
                
                this.friends.forEach(friend => {
                    friend.coordinates = [
                        friend.coordinates[0] + (Math.random() - 0.5) * 0.01,
                        friend.coordinates[1] + (Math.random() - 0.5) * 0.01
                    ];
                    friend.distance = Math.round(this.calculateDistance(
                        this.currentUser.coordinates[0], this.currentUser.coordinates[1],
                        friend.coordinates[0], friend.coordinates[1]
                    ) * 10) / 10;
                });
                
                this.updateMap();
                this.updateFriendList();
                
                refreshBtn.innerHTML = originalText;
                refreshBtn.disabled = false;
                this.showNotification('Location data updated');
            }, 1000);
        }
    },
    
    updateMap() {
        const [lat, lng] = this.currentUser.coordinates;
        const container = document.getElementById('community-map');
        if (!container) return;
        container.innerHTML = `<iframe 
            src="https://maps.google.com/maps?q=${lat},${lng}&z=14&output=embed&hl=es"
            style="width:100%;height:100%;border:none;border-radius:0.75rem"
            allowfullscreen loading="lazy">
        </iframe>`;
    },
    
    showFriendLocation(friendName) {
        const friend = this.friends.find(f => f.name === friendName);
        if (!friend || !friend.coordinates) return;
        const [lat, lng] = friend.coordinates;
        const container = document.getElementById('community-map');
        if (container) {
            container.innerHTML = `<iframe 
                src="https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed&hl=es"
                style="width:100%;height:100%;border:none;border-radius:0.75rem"
                allowfullscreen loading="lazy">
            </iframe>`;
        }
        this.showNotification(`Ubicación de ${friendName}`);
    },
    
    sendMessage(friendName) {
        this.showNotification(`Sending message to ${friendName}`);
    },
    
    addFriend(fisherName) {
        const fisher = this.nearbyFishers.find(f => f.name === fisherName);
        if (!fisher) return;
        
        if (this.friends.some(f => f.name === fisherName)) {
            this.showNotification(`${fisherName} is already your friend`, 'warning');
            return;
        }
        
        this.friends.push({
            id: fisher.id,
            name: fisher.name,
            avatar: fisher.avatar,
            coordinates: fisher.coordinates,
            status: 'online',
            distance: fisher.distance
        });
        
        this.nearbyFishers = this.nearbyFishers.filter(f => f.name !== fisherName);
        this.updateFriendList();
        this.updateNearbyFishers();
        this.addFriendMarkers();
        this.showNotification(`${fisherName} added as a friend`);
    },
    
    joinActivity(activityTitle) {
        const activity = this.groupActivities.find(a => a.title === activityTitle);
        if (!activity) return;
        
        if (activity.participants.includes(this.currentUser.id)) {
            this.showNotification('You have already joined this activity', 'warning');
            return;
        }
        
        if (activity.participants.length >= activity.maxParticipants) {
            this.showNotification('This activity is full', 'error');
            return;
        }
        
        activity.participants.push(this.currentUser.id);
        this.updateGroupActivities();
        this.showNotification(`Successfully joined "${activityTitle}"`);
    },
    
    createActivity() {
        this.showNotification('Create activity feature coming in a future update');
    },
    
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth radius in km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    },
    
    toRad(degrees) {
        return degrees * (Math.PI / 180);
    },
    
    showNotification(message, type = 'success') {
        alert(message);
    }
};

window.communityModule = communityModule;