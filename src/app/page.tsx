'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import HolidayJp from '@holiday-jp/holiday_jp';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

type Event = {
  id: number;
  date: string;
  time?: string;
  title: string;
  venue: string;
  source_url?: string;
  notes?: string;
};

export default function Home() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [monthlyEvents, setMonthlyEvents] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-11

  // 月間データ取得
  useEffect(() => {
    const fetchMonthlyData = async () => {
      const year = currentYear;
      const month = currentMonth + 1; // 1-12に変換
      
      // その月の1日から最終日まで
      const firstDay = `${year}-${month.toString().padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate(); // その月の最終日
      const lastDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

      console.log(`データ取得範囲: ${firstDay} から ${lastDate}`);

      try {
        const { data, error } = await supabase
          .from('events')
          .select('date')
          .gte('date', firstDay)
          .lte('date', lastDate);

        if (error) {
          console.error('データ取得エラー:', error);
          return;
        }

        console.log(`取得データ数: ${data?.length || 0}件`);

        // 日別カウント
        const counts: Record<string, number> = {};
        data?.forEach((event) => {
          counts[event.date] = (counts[event.date] || 0) + 1;
        });

        console.log('日別カウント:', counts);
        setMonthlyEvents(counts);

      } catch (error) {
        console.error('取得エラー:', error);
      }
    };

    fetchMonthlyData();
  }, [currentYear, currentMonth]);

  // 選択日のイベント詳細取得
  useEffect(() => {
    const fetchDayEvents = async () => {
      setLoading(true);
      const dateStr = selectedDate.toISOString().split('T')[0];

      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('date', dateStr)
          .order('time', { ascending: true });

        setEvents(data || []);
      } catch (error) {
        console.error('日別データ取得エラー:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDayEvents();
  }, [selectedDate]);

  // カレンダー生成関数
  const generateCalendar = () => {
    const year = currentYear;
    const month = currentMonth;
    
    console.log('カレンダー生成:', { year, month });
    
    // その月の1日と最終日（UTC時刻で固定して計算）
    const firstDay = new Date(year, month, 1, 12, 0, 0); // 正午で固定
    const lastDay = new Date(year, month + 1, 0, 12, 0, 0); // 正午で固定
    
    // カレンダーの週開始位置と日数
    const startDayOfWeek = firstDay.getDay(); // 0=日曜
    const daysInMonth = lastDay.getDate();
    
    const calendar = [];
    
    // 前月の末尾を埋める
    const prevMonthLastDay = new Date(year, month, 0, 12, 0, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      calendar.push({
        day,
        date: new Date(year, month - 1, day, 12, 0, 0),
        isCurrentMonth: false
      });
    }
    
    // 当月の日付（デバッグログ追加）
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month, day, 12, 0, 0);
      if (day === 1) {
        console.log('10月1日生成:', { 
          year, 
          month, 
          day, 
          dateObj,
          isoString: dateObj.toISOString(),
          dateString: dateObj.toISOString().split('T')[0]
        });
      }
      
      calendar.push({
        day,
        date: dateObj,
        isCurrentMonth: true
      });
    }
    
    // 次月の先頭を埋める（6週間分まで）
    const remaining = 42 - calendar.length;
    for (let day = 1; day <= remaining; day++) {
      calendar.push({
        day,
        date: new Date(year, month + 1, day, 12, 0, 0),
        isCurrentMonth: false
      });
    }
    
    return calendar;
  };

  const calendar = generateCalendar();

  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ];

  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  const formatTime = (time?: string) => {
    if (!time) return '（時刻未定）';
    return time.substring(0, 5);
  };

  const handlePrevMonth = () => {
    const newDate = new Date(currentYear, currentMonth - 1, 1);
    setCurrentDate(newDate);
    setSelectedDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentYear, currentMonth + 1, 1);
    setCurrentDate(newDate);
    setSelectedDate(newDate);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          福岡イベントカレンダー
        </h1>

        {/* カレンダー */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          {/* ヘッダー */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handlePrevMonth}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              &lt;
            </button>
            
            <h2 className="text-xl font-semibold">
              {currentYear}年{monthNames[currentMonth]}
            </h2>
            
            <button
              onClick={handleNextMonth}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              &gt;
            </button>
          </div>

          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 mb-2">
            {weekDays.map((day, index) => (
              <div key={day} className={`text-center font-medium py-2 ${
                index === 0 ? 'text-red-600' : 
                index === 6 ? 'text-blue-600' : 'text-gray-700'
              }`}>
                {day}
              </div>
            ))}
          </div>

          {/* カレンダーグリッド */}
          <div className="grid grid-cols-7 gap-1">
            {calendar.map((dayInfo, index) => {
              const dateString = dayInfo.date.toISOString().split('T')[0];
              const eventCount = dayInfo.isCurrentMonth ? (monthlyEvents[dateString] || 0) : 0;
              const isSelected = selectedDate.toDateString() === dayInfo.date.toDateString();
              const isToday = new Date().toDateString() === dayInfo.date.toDateString();
              const isHoliday = HolidayJp.isHoliday(dayInfo.date);
              const weekDay = dayInfo.date.getDay();

              // デバッグログ（10月1日のみ）
              if (dayInfo.day === 1 && dayInfo.isCurrentMonth && currentMonth === 9) {
                console.log('10月1日デバッグ:', {
                  day: dayInfo.day,
                  dateString,
                  eventCount,
                  rawCount: monthlyEvents[dateString],
                  isCurrentMonth: dayInfo.isCurrentMonth
                });
              }

              // 文字色決定
              let textColor = 'text-gray-700';
              if (!dayInfo.isCurrentMonth) {
                textColor = 'text-gray-300';
              } else if (isHoliday || weekDay === 0) {
                textColor = 'text-red-600';
              } else if (weekDay === 6) {
                textColor = 'text-blue-600';
              }

              return (
                <button
                  key={index}
                  onClick={() => setSelectedDate(dayInfo.date)}
                  className={`
                    min-h-[80px] p-2 border border-gray-200 hover:bg-gray-50 
                    flex flex-col items-center justify-start rounded
                    ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
                    ${isToday ? 'bg-yellow-50' : ''}
                  `}
                >
                  <span className={`text-sm font-medium ${textColor} mb-1`}>
                    {dayInfo.day}
                  </span>
                  
                  {dayInfo.isCurrentMonth && eventCount > 0 && (
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      eventCount >= 5 ? 'bg-red-100 text-red-800' :
                      eventCount >= 3 ? 'bg-orange-100 text-orange-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {eventCount}件
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* イベント詳細 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {selectedDate.toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long'
            })}のイベント
          </h2>

          {loading ? (
            <p className="text-gray-600">読み込み中...</p>
          ) : events.length > 0 ? (
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.id} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-blue-600">
                      {formatTime(event.time)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {event.venue}
                    </span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-800">
                    {event.title}
                  </h3>
                  {event.notes && (
                    <p className="text-sm text-gray-600 mt-1">
                      {event.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 text-lg">
                この日はイベントの掲載がありません
              </p>
            </div>
          )}

          <div className="mt-6 pt-4 border-t text-sm text-gray-500">
            <p>【対応会場】</p>
            <p>マリンメッセA館・マリンメッセB館・福岡国際センター・福岡国際会議場・福岡サンパレス・みずほPayPayドーム・ベスト電器スタジアム</p>
          </div>
        </div>
      </div>
    </div>
  );
}