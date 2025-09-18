'use client';

import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import { createClient } from '@supabase/supabase-js';
import 'react-calendar/dist/Calendar.css';
import HolidayJp from '@holiday-jp/holiday_jp';

// Supabase設定
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
  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [monthlyEventCounts, setMonthlyEventCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  // 月が変更されたときに月間データと件数を取得
  useEffect(() => {
    const fetchMonthlyData = async () => {
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // 0ベースなので+1
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`;

      try {
        // 月間の全イベントを取得
        const { data, error } = await supabase
          .from('events')
          .select('date')
          .gte('date', startDate)
          .lt('date', endDate);

        if (error) {
          console.error('月間データ取得エラー:', error);
          setMonthlyEventCounts({});
        } else {
          // 日別の件数をカウント
          const counts: Record<string, number> = {};
          data?.forEach((event) => {
            counts[event.date] = (counts[event.date] || 0) + 1;
          });
          setMonthlyEventCounts(counts);
        }
      } catch (error) {
        console.error('月間データ取得エラー:', error);
        setMonthlyEventCounts({});
      }
    };

    fetchMonthlyData();
  }, [date.getFullYear(), date.getMonth()]);

  // 選択された日のイベント詳細を取得
  useEffect(() => {
    const fetchDayEvents = async () => {
      setLoading(true);
      
      const selectedDate = date.toISOString().split('T')[0];
      
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('date', selectedDate)
          .order('time', { ascending: true });

        if (error) {
          console.error('Supabaseエラー:', error);
          setEvents([]);
        } else {
          setEvents(data || []);
        }
      } catch (error) {
        console.error('データ取得エラー:', error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDayEvents();
  }, [date]);

  const formatTime = (time?: string) => {
    if (!time) return '（時刻未定）';
    return time.substring(0, 5); // HH:MM形式に
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          福岡イベントカレンダー
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-8 flex justify-center">
          <Calendar
            onChange={(value) => {
              if (value && value instanceof Date) {
                setDate(value);
              }
            }}
            value={date}
            className="react-calendar-large"
            locale="ja-JP"
            tileClassName={({ date }) => {
              // 祝日判定
              const isHoliday = HolidayJp.isHoliday(date);
              if (isHoliday) return 'holiday-tile';
              
              return '';
            }}
            tileContent={({ date }) => {
              const dateStr = date.toISOString().split('T')[0];
              const eventCount = monthlyEventCounts[dateStr] || 0;
              
              // 件数に応じてCSSクラスを決定
              let countClass = 'event-count';
              if (eventCount >= 5) countClass += ' high-count';
              else if (eventCount >= 3) countClass += ' medium-count';
              else if (eventCount >= 1) countClass += ' low-count';
              else countClass += ' no-count';
              
              return (
                <div className="tile-content">
                  <div className="date-number">
                    {date.getDate()}
                  </div>
                  <div className={countClass}>
                    {eventCount > 0 ? `${eventCount}件` : '0件'}
                  </div>
                </div>
              );
            }}
          />
        </div>

        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {date.toLocaleDateString('ja-JP', {
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
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
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
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 text-lg">
                この日はイベントの掲載がありません
              </p>
              <p className="text-gray-400 text-sm mt-2">
                別の日付を選択してみてください
              </p>
            </div>
          )}

          <div className="mt-6 pt-4 border-t text-sm text-gray-500">
            <p>データベース内のイベント情報を表示中</p>
            <p>【対応会場】</p>
            <p>マリンメッセA館・マリンメッセB館・福岡国際センター・福岡国際会議場</p>
            <p>福岡サンパレス・みずほPayPayドーム・ベスト電器スタジアム</p>
          </div>
        </div>
      </div>
    </div>
  );
}