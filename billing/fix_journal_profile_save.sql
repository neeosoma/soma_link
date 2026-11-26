-- =====================================================================
-- SOMA~LINK // FIX: сохранение сигнала/кассеты на виниле падает в браузере
-- -------------------------------------------------------------------------
-- Симптом: в браузере (не в Telegram) при отправке сигнала и при сохранении
-- на кассету — ошибка. Причина: save_soma_journal_entry требовал, чтобы
-- сессию auth.uid() была привязана к профилю (user_profile_bindings).
-- Привязка выполняется в boot через bind_my_soma_profile, но она в try/catch
-- и может не выполниться (профиль создан, но привязки нет) — тогда
-- save_soma_journal_entry падал на «Profile not bound». В базе было 7 профилей
-- без привязки.
--
-- Fix: RPC получает опциональный p_uid (player.uid). Если передан — RPC
-- сам привязывает сессию к профилю (auto-bind) и сохраняет по нему. Это
-- делает сохранение самодостаточным: не зависит от того, выполнилась ли
-- привязка в boot. Обратно совместим: p_uid default null — старые 7-аргументные
-- вызовы работают по прежней логике (через существующую привязку).
--
-- Идемпотентно. Применить в Supabase → SQL Editor → New query → Run (как owner).
-- =====================================================================

begin;

drop function if exists public.save_soma_journal_entry(text, text, text, text, integer, boolean, text, text);
drop function if exists public.save_soma_journal_entry(text, text, text, text, integer, boolean, text);
create or replace function public.save_soma_journal_entry(
    p_id text, p_kind text, p_text text, p_date text, p_num integer, p_fav boolean, p_tag text,
    p_uid text default null
)
returns setof soma_journal
language plpgsql
security definer
set search_path = 'public', pg_temp
as $$
declare
    v_profile text;
begin
    if auth.uid() is null then
        raise exception 'Authentication required';
    end if;
    if p_kind not in ('cassette', 'entry') then
        p_kind := 'cassette';
    end if;
    if char_length(p_id) < 1 or char_length(p_id) > 64 then
        raise exception 'invalid_id';
    end if;
    if char_length(p_text) < 1 or char_length(p_text) > 2000 then
        raise exception 'invalid_text: 1..2000 chars';
    end if;
    if public.soma_text_blocked(p_text) then
        raise exception 'invalid_text: содержит запрещённую лексику';
    end if;
    if p_tag is not null and char_length(p_tag) > 32 then
        p_tag := substr(p_tag, 1, 32);
    end if;

    -- Профиль: явный p_uid (с авто-привязкой сессии) или существующая привязка.
    if p_uid is not null and p_uid ~ '^u_[0-9a-f]{4,32}$' then
        v_profile := p_uid;
        insert into soma_private.user_profile_bindings (auth_id, profile_uid)
        values (auth.uid(), p_uid)
        on conflict (auth_id) do update
            set profile_uid = excluded.profile_uid;
    else
        select b.profile_uid into v_profile
          from soma_private.user_profile_bindings b
         where b.auth_id = auth.uid();
    end if;
    if v_profile is null then
        raise exception 'Profile not bound';
    end if;

    insert into public.soma_journal (id, kind, text, date_label, num, fav, tag, author_auth_id, author_profile_uid)
    values (p_id, p_kind, p_text, p_date, coalesce(p_num, 0), coalesce(p_fav, false), coalesce(p_tag, ''), auth.uid(), v_profile)
    on conflict (id) do update
        set kind = excluded.kind,
            text = excluded.text,
            date_label = excluded.date_label,
            num = excluded.num,
            fav = excluded.fav,
            tag = excluded.tag
        where public.soma_journal.author_profile_uid = v_profile;

    return query select j.* from public.soma_journal j where j.id = p_id;
end;
$$;

revoke all on function public.save_soma_journal_entry(text, text, text, text, integer, boolean, text, text) from public, anon;
grant execute on function public.save_soma_journal_entry(text, text, text, text, integer, boolean, text, text) to authenticated;

commit;
