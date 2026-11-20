-- =============================================================================
-- Ngising - Skema Database MySQL 8.x & Data Awal (Siap Import via Adminer/CLI)
-- Database target: Ngising
-- Catatan: Jangan sertakan CREATE DATABASE agar aman di-import pada managed DB
--          seperti Wasmer DB Explorer (Adminer) dengan user non-root.
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- 1. Tabel Metadata Aplikasi (menyimpan auth_secret & konfigurasi internal)
CREATE TABLE IF NOT EXISTS `app_meta` (
  `meta_key` VARCHAR(64) NOT NULL,
  `meta_value` TEXT NOT NULL,
  `updated_at` BIGINT NOT NULL,
  PRIMARY KEY (`meta_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabel Akun Karyawan & Admin
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(64) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `display_name` VARCHAR(100) NOT NULL,
  `department` VARCHAR(100) NOT NULL DEFAULT '',
  `role` ENUM('admin', 'employee') NOT NULL DEFAULT 'employee',
  `is_anonymous` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` BIGINT NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `password_salt` VARCHAR(128) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_users_email` (`email`),
  KEY `idx_users_display_name` (`display_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabel Status Toilet Kantor (1 Toilet Bersama)
CREATE TABLE IF NOT EXISTS `toilets` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `location` VARCHAR(120) NOT NULL,
  `status` ENUM('available', 'occupied', 'maintenance') NOT NULL DEFAULT 'available',
  `occupant_json` LONGTEXT NULL,
  `reserved_for_json` LONGTEXT NULL,
  `updated_at` BIGINT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabel Antrean Real-Time
CREATE TABLE IF NOT EXISTS `toilet_queue` (
  `id` VARCHAR(64) NOT NULL,
  `position` INT NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `display_name` VARCHAR(100) NOT NULL,
  `department` VARCHAR(120) NOT NULL DEFAULT '',
  `is_anonymous` TINYINT(1) NOT NULL DEFAULT 0,
  `is_guest` TINYINT(1) NOT NULL DEFAULT 0,
  `need` ENUM('pup', 'cepat') NOT NULL DEFAULT 'pup',
  `joined_at` BIGINT NOT NULL,
  `status` ENUM('waiting', 'called') NOT NULL DEFAULT 'waiting',
  `called_stall_id` VARCHAR(64) NULL,
  `called_at` BIGINT NULL,
  `expires_at` BIGINT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_queue_position` (`position`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabel Riwayat Sesi Penggunaan Toilet (untuk Statistik, Kuota Harian, & Leaderboard)
CREATE TABLE IF NOT EXISTS `toilet_history` (
  `id` VARCHAR(64) NOT NULL,
  `stall_id` VARCHAR(64) NOT NULL,
  `stall_name` VARCHAR(120) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `display_name` VARCHAR(100) NOT NULL,
  `department` VARCHAR(120) NOT NULL DEFAULT '',
  `is_anonymous` TINYINT(1) NOT NULL DEFAULT 0,
  `is_guest` TINYINT(1) NOT NULL DEFAULT 0,
  `need` ENUM('pup', 'cepat') NOT NULL DEFAULT 'pup',
  `started_at` BIGINT NOT NULL,
  `ended_at` BIGINT NOT NULL,
  `duration_ms` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_history_started` (`started_at`),
  KEY `idx_history_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabel Buku Tamu Kantor (Tamu / Customer Tanpa Login)
CREATE TABLE IF NOT EXISTS `guestbook_entries` (
  `id` VARCHAR(64) NOT NULL,
  `guest_id` VARCHAR(64) NOT NULL,
  `guest_name` VARCHAR(100) NOT NULL,
  `origin` VARCHAR(160) NOT NULL,
  `visited_at` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_guestbook_visited` (`visited_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- Data Awal (Seed)
-- Admin Default : nama = pujo | password = Sukangising
-- Karyawan Demo : Siti Rahma, Dimas Pratama, Bagus Saputra, Eko Nugroho (password: ngising123)
-- =============================================================================

INSERT IGNORE INTO `toilets` (`id`, `name`, `location`, `status`, `occupant_json`, `reserved_for_json`, `updated_at`) VALUES
('toilet-utama', 'Toilet Kantor', 'Area Belakang', 'available', NULL, NULL, UNIX_TIMESTAMP() * 1000);

INSERT IGNORE INTO `users` (`id`, `email`, `display_name`, `department`, `role`, `is_anonymous`, `created_at`, `password_hash`, `password_salt`) VALUES
('emp-admin', 'pujo@kantor.id', 'pujo', 'Operasional', 'admin', 0, UNIX_TIMESTAMP() * 1000 - 86400000, '222bcfe260d951eaa55f39555554f047fefb5768b176d739604324ed44b872cea13101fd67cbf9fce494f4f5bd7b6f7c6b53a05b25d7cda80734e7a76de9eccc', '2ed1602112972def99a8eb0e4e4a1849'),
('emp-siti', 'siti@kantor.id', 'Siti Rahma', 'Design', 'employee', 0, UNIX_TIMESTAMP() * 1000 - 86400000, '9eee288bdf970abc0f4ca8f544079dca5e0d2a666e207b909b213daf17185f2d87f5b90a9756c92c0efcb00fde990bdd2c09f2f3cfa5173ebce4fcc3b71f4bbf', 'bbf20c17200c56429238ee4b18ceb62b'),
('emp-dimas', 'dimas@kantor.id', 'Dimas Pratama', 'Engineering', 'employee', 0, UNIX_TIMESTAMP() * 1000 - 86400000, '26806201606268873425236ede6c2cf88bfec50714f618dc918f7b78c8b084fa28d59b5e0350d4476bb06d2c60d253444ed72cfdfad0e50f92d732039588086e', '9f50a29c0974deff248b56d3a715b6a2'),
('emp-bagus', 'bagus@kantor.id', 'Bagus Saputra', 'Product', 'employee', 0, UNIX_TIMESTAMP() * 1000 - 86400000, 'f031e63460d8e559d73f2090e93261de7cd548ed9a21988fda150b44a7bbacce2747226e69cf35eca343cce5ee2fe80e07746f0c2cf9633cd88915a52d3af91a', '165720c52b284e6cc8bb55a991c8cc18'),
('emp-eko', 'eko@kantor.id', 'Eko Nugroho', 'Operations', 'employee', 0, UNIX_TIMESTAMP() * 1000 - 86400000, 'e0ec53a7b4c8108f5b9ea5789ee2b59f78905930a086acedcbad07a79e78bbc0bd39a5fdaeb6e0159cca8fd2e7d3cbfcf4245c4cfda36d90836247fe96e893cf', '6b9e8d3818a2d24733930f555d9ee779');

-- Contoh riwayat minggu ini agar Leaderboard Mingguan langsung aktif
INSERT IGNORE INTO `toilet_history` (`id`, `stall_id`, `stall_name`, `user_id`, `display_name`, `department`, `is_anonymous`, `is_guest`, `need`, `started_at`, `ended_at`, `duration_ms`) VALUES
('hist-week-1', 'toilet-utama', 'Toilet Kantor', 'emp-dimas', 'Dimas Pratama', 'Engineering', 0, 0, 'pup', UNIX_TIMESTAMP() * 1000 - 86400000 - 720000, UNIX_TIMESTAMP() * 1000 - 86400000, 720000),
('hist-week-2', 'toilet-utama', 'Toilet Kantor', 'emp-dimas', 'Dimas Pratama', 'Engineering', 0, 0, 'pup', UNIX_TIMESTAMP() * 1000 - 172800000 - 540000, UNIX_TIMESTAMP() * 1000 - 172800000, 540000),
('hist-week-3', 'toilet-utama', 'Toilet Kantor', 'emp-eko', 'Eko Nugroho', 'Operations', 0, 0, 'pup', UNIX_TIMESTAMP() * 1000 - 86400000 - 600000, UNIX_TIMESTAMP() * 1000 - 86400000, 600000),
('hist-week-4', 'toilet-utama', 'Toilet Kantor', 'emp-siti', 'Siti Rahma', 'Design', 0, 0, 'cepat', UNIX_TIMESTAMP() * 1000 - 172800000 - 240000, UNIX_TIMESTAMP() * 1000 - 172800000, 240000),
('hist-week-5', 'toilet-utama', 'Toilet Kantor', 'emp-bagus', 'Bagus Saputra', 'Product', 0, 0, 'pup', UNIX_TIMESTAMP() * 1000 - 259200000 - 660000, UNIX_TIMESTAMP() * 1000 - 259200000, 660000);

INSERT IGNORE INTO `guestbook_entries` (`id`, `guest_id`, `guest_name`, `origin`, `visited_at`) VALUES
('gb-seed-1', 'guest-seed-1', 'Hendra Kusuma', 'PT Nusantara · Meeting Klien', UNIX_TIMESTAMP() * 1000 - 3300000);
