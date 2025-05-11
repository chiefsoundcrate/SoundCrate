const Leaderboard = () => {
    // Mock leaderboard data
    const leaderboardData = [
      { id: 1, rank: '01', name: 'Nora Jones', points: '1.5K' },
      { id: 2, rank: '02', name: 'John Smith', points: '2.3K' },
      { id: 3, rank: '03', name: 'Emily Davis', points: '1.8K' },
      { id: 4, rank: '04', name: 'Michael Brown', points: '3.1K' },
      { id: 5, rank: '05', name: 'Sarah Wilson', points: '4.5K' },
      { id: 6, rank: '06', name: 'David Johnson', points: '2.0K' },
      { id: 7, rank: '07', name: 'Linda Martinez', points: '1.2K' },
      { id: 8, rank: '08', name: 'Chris Lee', points: '2.9K' },
      { id: 9, rank: '09', name: 'Jessica Taylor', points: '3.8K' },
      { id: 10, rank: '10', name: 'James Anderson', points: '1.6K' },
    ];
  
    return (
      <div className="py-12 bg-[#111312]">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Leaderboard</h2>
        <p className="text-center text-xl mb-8">
          Join the forefront of music ownership and streaming with exclusive early access!
        </p>
        
        <div className="max-w-3xl mx-auto">
          {leaderboardData.map((item) => (
            <div 
              key={item.id} 
              className="flex items-center justify-between py-4 border-b border-gray-800"
            >
              <div className="flex items-center">
                <span className="text-gray-500 w-8">{item.rank}</span>
                <div className="w-8 h-8 rounded-full bg-gray-700 mx-4"></div>
                <span>{item.name}</span>
              </div>
              <span>{item.points}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  export default Leaderboard;