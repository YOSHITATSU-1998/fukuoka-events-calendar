'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// JST基準で今日の日付を取得する関数
const getJSTToday = () => {
  const now = new Date();
  const jstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  return new Date(jstTime.getFullYear(), jstTime.getMonth(), jstTime.getDate(), 12, 0, 0);
};

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dbConnection, setDbConnection] = useState<'checking' | 'connected' | 'error'>('checking');
  const [eventCount, setEventCount] = useState<number | null>(null);

  // 1秒ごとに時刻を更新
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // データベース接続チェック
  useEffect(() => {
    const checkDbConnection = async () => {
      try {
        const { error, count } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true });

        if (error) {
          setDbConnection('error');
          console.error('DB接続エラー:', error);
        } else {
          setDbConnection('connected');
          setEventCount(count || 0);
        }
      } catch (error) {
        setDbConnection('error');
        console.error('DB接続チェックエラー:', error);
      }
    };

    if (isAuthenticated) {
      checkDbConnection();
    }
  }, [isAuthenticated]);

  const handleLogin = () => {
    // Ver.1.8と同じパスワード（GitHub Secretsで管理）
    if (password === '19981006') {
      setIsAuthenticated(true);
    } else {
      alert('パスワードが正しくありません');
    }
  };

  // 認証前の画面
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
            管理者ページ
          </h1>
          <div className="space-y-4">
            <input
              type="password"
              placeholder="パスワードを入力"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
            <button
              onClick={handleLogin}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              ログイン
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 時刻表示のヘルパー関数
  const formatDateTime = (date: Date, label: string) => {
    return {
      label,
      datetime: date.toLocaleString('ja-JP', { 
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      iso: date.toISOString(),
      timestamp: date.getTime()
    };
  };

  // 各種時刻情報
  const browserTime = formatDateTime(currentTime, 'ブラウザローカル時間');
  const utcTime = formatDateTime(new Date(currentTime.toISOString()), 'UTC時間');
  const jstCalculated = formatDateTime(new Date(currentTime.getTime() + (9 * 60 * 60 * 1000)), 'JST計算結果');
  const jstToday = getJSTToday();
  const todayInfo = formatDateTime(jstToday, 'JST今日（正午固定）');

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">
              システム管理者ページ
            </h1>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              ログアウト
            </button>
          </div>

          {/* リアルタイム時刻表示 */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* 時刻情報 */}
            <div className="bg-blue-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-blue-800 mb-4">
                🕐 サーバー時刻情報
              </h2>
              <div className="space-y-3 text-sm font-mono">
                {[browserTime, utcTime, jstCalculated, todayInfo].map((timeInfo) => (
                  <div key={timeInfo.label} className="border-b border-blue-200 pb-2">
                    <div className="font-semibold text-blue-700">{timeInfo.label}</div>
                    <div className="text-gray-700">{timeInfo.datetime}</div>
                    <div className="text-xs text-gray-500">{timeInfo.iso}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* システム状態 */}
            <div className="bg-green-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-green-800 mb-4">
                🗄️ システム状態
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">データベース接続</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    dbConnection === 'connected' ? 'bg-green-100 text-green-800' :
                    dbConnection === 'error' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {dbConnection === 'connected' ? '正常' :
                     dbConnection === 'error' ? 'エラー' : '確認中'}
                  </span>
                </div>
                
                {eventCount !== null && (
                  <div className="flex items-center justify-between">
                    <span className="font-medium">総イベント数</span>
                    <span className="text-xl font-bold text-green-700">{eventCount}件</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="font-medium">JST今日の日付</span>
                  <span className="font-mono text-blue-600">
                    {jstToday.toISOString().split('T')[0]}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* デバッグ情報 */}
          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              🔧 デバッグ情報
            </h2>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-gray-700 mb-2">ブラウザ情報</div>
                <div className="bg-white p-3 rounded border font-mono text-xs">
                  <div>User Agent: {navigator.userAgent}</div>
                  <div>Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</div>
                  <div>Locale: {navigator.language}</div>
                </div>
              </div>
              
              <div>
                <div className="font-medium text-gray-700 mb-2">時差計算</div>
                <div className="bg-white p-3 rounded border font-mono text-xs">
                  <div>Timezone Offset: {currentTime.getTimezoneOffset()}分</div>
                  <div>JST Offset: +9時間 (540分)</div>
                  <div>計算式: UTC + 9h = JST</div>
                </div>
              </div>
            </div>
          </div>

          {/* カレンダーサイトに戻る */}
          <div className="text-center pt-6 border-t border-gray-200">
            <Link
              href="/"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              📅 カレンダーサイトに戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}