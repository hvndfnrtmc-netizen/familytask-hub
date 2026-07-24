export default {
  pages: [
    'pages/login/index',
    'pages/index/index',
    'pages/tasks/index',
    'pages/calendar/index',
    'pages/members/index',
    'pages/rewards/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#f97316',
    navigationBarTitleText: 'FamLoop',
    navigationBarTextStyle: 'white',
  },
  tabBar: {
    color: '#9ca3af',
    selectedColor: '#f97316',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      { pagePath: 'pages/index/index',    text: '总览',   iconPath: 'assets/icons/home.png',     selectedIconPath: 'assets/icons/home-active.png'     },
      { pagePath: 'pages/tasks/index',    text: '任务',   iconPath: 'assets/icons/task.png',     selectedIconPath: 'assets/icons/task-active.png'     },
      { pagePath: 'pages/calendar/index', text: '日历',   iconPath: 'assets/icons/calendar.png', selectedIconPath: 'assets/icons/calendar-active.png' },
      { pagePath: 'pages/members/index',  text: '成员',   iconPath: 'assets/icons/member.png',   selectedIconPath: 'assets/icons/member-active.png'   },
      { pagePath: 'pages/rewards/index',  text: '积分',   iconPath: 'assets/icons/reward.png',   selectedIconPath: 'assets/icons/reward-active.png'   },
    ],
  },
};
