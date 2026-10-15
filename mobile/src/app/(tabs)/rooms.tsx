import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState, useEffect } from "react";
import { Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CopySheet, type CopyOutcome, type CopySource } from "@/components/copy-sheet";
import { ReadyModal } from "@/components/ready-modal";
import { Avatar, Chip, Mono, SideChip, T } from "@/components/ui";
import { SettingsButton } from "@/components/visuals";
import { fmtAge, fmtPrice, fmtSize, shortAddr } from "@/lib/format";
import { useRooms, type RoomSetup } from "@/lib/rooms";
import { useTheme } from "@/theme/theme";
import { fonts } from "@/theme/tokens";

export default function Rooms() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    rooms,
    activeRoom,
    switchRoom,
    createRoom,
    joinRoom,
    addToWatchlist,
    removeFromWatchlist,
  } = useRooms();

  const [copying, setCopying] = useState<CopySource | null>(null);
  const [outcome, setOutcome] = useState<CopyOutcome | null>(null);

  // New room / Join room modal
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [roomModalTab, setRoomModalTab] = useState<"create" | "join">("create");
  const [newRoomName, setNewRoomName] = useState("");
  const [joinRoomCode, setJoinRoomCode] = useState("");

  // Add trader modal
  const [addTraderOpen, setAddTraderOpen] = useState(false);
  const [traderInput, setTraderInput] = useState("");

  // Feedback for copying room code
  const [codeCopied, setCodeCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  const stacked = (child: React.ReactNode, first = false) => (
    <View style={{ marginLeft: first ? 0 : -9, borderRadius: 11, borderWidth: 2, borderColor: t.ring }}>{child}</View>
  );

  const handleCopyCode = () => {
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleCreateRoom = () => {
    if (!newRoomName.trim()) return;
    createRoom(newRoomName.trim());
    setNewRoomName("");
    setRoomModalOpen(false);
  };

  const handleJoinRoom = () => {
    if (!joinRoomCode.trim()) return;
    joinRoom(joinRoomCode.trim());
    setJoinRoomCode("");
    setRoomModalOpen(false);
  };

  const handleAddTrader = () => {
    if (!traderInput.trim()) return;
    addToWatchlist(traderInput.trim());
    setTraderInput("");
    setAddTraderOpen(false);
  };

  const toCopySource = (setup: RoomSetup): CopySource => ({
    market: setup.market,
    trader: setup.trader,
    who: shortAddr(setup.trader),
    label: setup.author,
    isBuy: setup.isBuy,
    pair: setup.pair,
    base: setup.base,
    size: setup.size,
    price: setup.price,
    age: fmtAge(now - setup.timestamp),
    minSize: 200,
  });

  return (
    <View style={{ flex: 1, backgroundColor: t.inv }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 40 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 22, paddingTop: 22 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <T style={{ fontSize: 30, fontFamily: fonts.semibold, letterSpacing: -1.05 }}>Dojo</T>
              <Mono style={{ fontSize: 11, color: t.ink5, marginTop: 4 }}>SHARED TRADING ROOMS</Mono>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Pressable
                onPress={() => setRoomModalOpen(true)}
                style={({ pressed }) => ({
                  paddingVertical: 8,
                  paddingHorizontal: 13,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: "rgba(131,110,249,.4)",
                  backgroundColor: pressed ? t.purpTint18 : "transparent",
                })}
              >
                <Mono style={{ fontSize: 11, color: t.purp }}>+ NEW ROOM</Mono>
              </Pressable>
              <SettingsButton />
            </View>
          </View>
        </View>

        {/* Room Switcher Pills if multiple rooms */}
        {rooms.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 22, gap: 8, marginTop: 14 }}>
            {rooms.map((r) => {
              const active = r.id === activeRoom.id;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => switchRoom(r.id)}
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? t.purp : t.a14,
                    backgroundColor: active ? t.purpTint18 : "transparent",
                  }}
                >
                  <Mono style={{ fontSize: 11, color: active ? t.purpInk : t.ink4 }}>{r.name.toUpperCase()}</Mono>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* Room Hero Card */}
        <View style={{ paddingHorizontal: 22, marginTop: 14 }}>
          <LinearGradient
            colors={["rgba(131,110,249,.2)", "rgba(160,5,93,.12)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 22, padding: 20, borderWidth: 1, borderColor: "rgba(131,110,249,.3)" }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <T style={{ fontSize: 21, fontFamily: fonts.semibold, letterSpacing: -0.5 }}>{activeRoom.name}</T>
                <Pressable onPress={handleCopyCode} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 7 }}>
                  <Mono style={{ fontSize: 11, color: t.purp }}>
                    {codeCopied ? "CODE COPIED ✓" : `CODE ${activeRoom.code} · TAP TO COPY`}
                  </Mono>
                  <Chip label={`${activeRoom.membersCount} MEMBERS`} bg={t.a10} color={t.ink3} />
                </Pressable>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Mono style={{ fontSize: 9.5, letterSpacing: 0.8, color: t.ink2 }}>ROOM PNL 7D</Mono>
                <Mono style={{ fontSize: 21, fontFamily: fonts.monoSemibold, color: activeRoom.pnl7d >= 0 ? t.grn2 : t.berryInk, marginTop: 5 }}>
                  {activeRoom.pnl7d >= 0 ? `+${activeRoom.pnl7d}%` : `${activeRoom.pnl7d}%`}
                </Mono>
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 18 }}>
              {stacked(<Avatar size={30} radius={9} />, true)}
              {stacked(<Avatar size={30} radius={9} colors={[t.berry, t.purp]} />)}
              {stacked(<Avatar size={30} radius={9} colors={[t.purpAlt, t.berry]} />)}
              {stacked(
                <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: t.a14, alignItems: "center", justifyContent: "center" }}>
                  <Mono style={{ fontSize: 10 }}>+{Math.max(1, activeRoom.membersCount - 3)}</Mono>
                </View>,
              )}
            </View>
          </LinearGradient>
        </View>

        {/* Shared Watchlist */}
        <View style={{ paddingHorizontal: 22, paddingTop: 20 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Mono style={{ fontSize: 10, letterSpacing: 1, color: t.ink5 }}>SHARED WATCHLIST ({activeRoom.watchlist.length})</Mono>
            <Pressable onPress={() => setAddTraderOpen(true)} hitSlop={8}>
              <Mono style={{ fontSize: 10.5, color: t.purp }}>+ ADD TRADER</Mono>
            </Pressable>
          </View>

          {activeRoom.watchlist.length === 0 ? (
            <View style={{ padding: 16, borderRadius: 14, backgroundColor: t.card, borderWidth: 1, borderColor: t.a09 }}>
              <Mono style={{ fontSize: 11, color: t.ink5, textAlign: "center" }}>No traders on this room watchlist yet. Tap + ADD TRADER to add one.</Mono>
            </View>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 9 }}>
              {activeRoom.watchlist.map((h) => (
                <Pressable
                  key={h}
                  onPress={() => router.push({ pathname: "/trader/[handle]", params: { handle: h } })}
                  onLongPress={() => removeFromWatchlist(h)}
                  style={({ pressed }) => ({
                    paddingVertical: 9,
                    paddingHorizontal: 13,
                    borderRadius: 10,
                    backgroundColor: pressed ? t.purpTint18 : t.card,
                    borderWidth: 1,
                    borderColor: pressed ? t.purp : t.a10,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  })}
                >
                  <Mono style={{ fontSize: 11.5, color: t.ink }}>{h.startsWith("0x") ? shortAddr(h) : h}</Mono>
                  <Mono style={{ fontSize: 10, color: t.purp }}>↗</Mono>
                </Pressable>
              ))}
            </View>
          )}

          {/* Setups Shared Feed */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 26, marginBottom: 13 }}>
            <Mono style={{ fontSize: 10, letterSpacing: 1, color: t.ink5 }}>SETUPS SHARED ({activeRoom.setups.length})</Mono>
            <Mono style={{ fontSize: 10, color: t.ink6 }}>LIVE ROOM FEED</Mono>
          </View>

          {activeRoom.setups.length === 0 ? (
            <View style={{ padding: 24, borderRadius: 18, backgroundColor: t.card, borderWidth: 1, borderColor: t.a09, alignItems: "center" }}>
              <Mono style={{ fontSize: 11.5, color: t.ink5, textAlign: "center", lineHeight: 18 }}>
                No setups shared into this room yet.{"\n"}
                Copy any trade in the Feed and tap "Share into room" to post setups here.
              </Mono>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {activeRoom.setups.map((s) => {
                const isCopied = s.type === "copied";
                return (
                  <View
                    key={s.id}
                    style={{
                      borderRadius: 18,
                      backgroundColor: t.card,
                      borderWidth: 1,
                      borderColor: t.a09,
                      padding: 16,
                      opacity: isCopied ? 0.85 : 1,
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Avatar size={24} radius={8} />
                        <T style={{ fontSize: 14, fontFamily: fonts.semibold }}>
                          {s.author === "you" ? "You" : s.author} {isCopied ? "copied a trade" : "shared a setup"}
                        </T>
                      </View>
                      <Mono style={{ fontSize: 10.5, color: t.ink6 }}>{fmtAge(now - s.timestamp)}</Mono>
                    </View>

                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                        <SideChip isBuy={s.isBuy} text={s.isBuy ? "BUY" : "SELL"} />
                        <T style={{ fontSize: 15, fontFamily: fonts.semibold }}>{s.pair}</T>
                        <Mono style={{ fontSize: 12, color: t.ink3 }}>@ {fmtPrice(s.price)}</Mono>
                      </View>
                      {s.confirmMs != null && (
                        <Chip label={`FILLED ${s.confirmMs}ms`} bg={t.g12} color={t.grn} />
                      )}
                    </View>

                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                      <Mono style={{ fontSize: 11, color: t.ink5 }}>
                        SIZE: {fmtSize(s.size)} {s.base}
                      </Mono>
                      <Mono style={{ fontSize: 10.5, color: t.ink6 }}>
                        VIA {shortAddr(s.trader)}
                      </Mono>
                    </View>

                    <View style={{ flexDirection: "row", gap: 9, marginTop: 14 }}>
                      <Pressable
                        onPress={() => setCopying(toCopySource(s))}
                        style={({ pressed }) => ({
                          flex: 1,
                          height: 40,
                          borderRadius: 11,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: pressed ? t.purpHov : t.purp,
                        })}
                      >
                        <T style={{ fontSize: 13.5, fontFamily: fonts.semibold, color: t.inv }}>Copy setup</T>
                      </Pressable>
                      <Pressable
                        onPress={() => router.push({ pathname: "/trader/[handle]", params: { handle: s.trader } })}
                        style={({ pressed }) => ({
                          height: 40,
                          paddingHorizontal: 15,
                          borderRadius: 11,
                          borderWidth: 1,
                          borderColor: pressed ? t.purp : t.a16,
                          justifyContent: "center",
                          backgroundColor: pressed ? t.purpTint18 : "transparent",
                        })}
                      >
                        <Mono style={{ fontSize: 12, color: t.ink2 }}>DETAIL ↗</Mono>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Copy Sheet and Outcome Modal */}
      <CopySheet
        order={copying}
        onClose={() => setCopying(null)}
        onDone={(res) => {
          setCopying(null);
          setOutcome(res);
        }}
      />
      <ReadyModal outcome={outcome} onClose={() => setOutcome(null)} />

      {/* Modal: New Room / Join Room */}
      <Modal visible={roomModalOpen} transparent animationType="fade" onRequestClose={() => setRoomModalOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: t.panel, borderRadius: 24, padding: 22, borderWidth: 1, borderColor: t.a14 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <T style={{ fontSize: 20, fontFamily: fonts.semibold }}>Dojo Room</T>
              <Pressable onPress={() => setRoomModalOpen(false)} hitSlop={10}>
                <Mono style={{ fontSize: 14, color: t.ink4 }}>✕</Mono>
              </Pressable>
            </View>

            {/* Tabs */}
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 18 }}>
              <Pressable
                onPress={() => setRoomModalTab("create")}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 10,
                  alignItems: "center",
                  backgroundColor: roomModalTab === "create" ? t.purp : "transparent",
                  borderWidth: roomModalTab === "create" ? 0 : 1,
                  borderColor: t.a14,
                }}
              >
                <Mono style={{ fontSize: 11.5, color: roomModalTab === "create" ? t.inv : t.ink3 }}>CREATE ROOM</Mono>
              </Pressable>
              <Pressable
                onPress={() => setRoomModalTab("join")}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 10,
                  alignItems: "center",
                  backgroundColor: roomModalTab === "join" ? t.purp : "transparent",
                  borderWidth: roomModalTab === "join" ? 0 : 1,
                  borderColor: t.a14,
                }}
              >
                <Mono style={{ fontSize: 11.5, color: roomModalTab === "join" ? t.inv : t.ink3 }}>JOIN WITH CODE</Mono>
              </Pressable>
            </View>

            {roomModalTab === "create" ? (
              <View style={{ gap: 14 }}>
                <View>
                  <Mono style={{ fontSize: 10, color: t.ink5, marginBottom: 6 }}>ROOM NAME</Mono>
                  <TextInput
                    value={newRoomName}
                    onChangeText={setNewRoomName}
                    placeholder="e.g. Monad Alphas"
                    placeholderTextColor={t.ink6}
                    style={{
                      height: 46,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: t.a16,
                      paddingHorizontal: 14,
                      color: t.ink,
                      fontFamily: fonts.mono,
                      fontSize: 13,
                      backgroundColor: t.card,
                    }}
                  />
                </View>
                <Pressable
                  onPress={handleCreateRoom}
                  style={({ pressed }) => ({
                    height: 48,
                    borderRadius: 13,
                    backgroundColor: pressed ? t.purpHov : t.purp,
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 6,
                  })}
                >
                  <T style={{ fontSize: 14, fontFamily: fonts.semibold, color: t.inv }}>Create & Enter Room</T>
                </Pressable>
              </View>
            ) : (
              <View style={{ gap: 14 }}>
                <View>
                  <Mono style={{ fontSize: 10, color: t.ink5, marginBottom: 6 }}>ROOM CODE</Mono>
                  <TextInput
                    value={joinRoomCode}
                    onChangeText={setJoinRoomCode}
                    placeholder="e.g. KAGE-7F2"
                    placeholderTextColor={t.ink6}
                    autoCapitalize="characters"
                    style={{
                      height: 46,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: t.a16,
                      paddingHorizontal: 14,
                      color: t.ink,
                      fontFamily: fonts.mono,
                      fontSize: 13,
                      backgroundColor: t.card,
                    }}
                  />
                </View>
                <Pressable
                  onPress={handleJoinRoom}
                  style={({ pressed }) => ({
                    height: 48,
                    borderRadius: 13,
                    backgroundColor: pressed ? t.purpHov : t.purp,
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 6,
                  })}
                >
                  <T style={{ fontSize: 14, fontFamily: fonts.semibold, color: t.inv }}>Join Room</T>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal: Add Trader to Watchlist */}
      <Modal visible={addTraderOpen} transparent animationType="fade" onRequestClose={() => setAddTraderOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: t.panel, borderRadius: 24, padding: 22, borderWidth: 1, borderColor: t.a14 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <T style={{ fontSize: 20, fontFamily: fonts.semibold }}>Add to Watchlist</T>
              <Pressable onPress={() => setAddTraderOpen(false)} hitSlop={10}>
                <Mono style={{ fontSize: 14, color: t.ink4 }}>✕</Mono>
              </Pressable>
            </View>

            <View style={{ gap: 14 }}>
              <View>
                <Mono style={{ fontSize: 10, color: t.ink5, marginBottom: 6 }}>TRADER ADDRESS OR HANDLE</Mono>
                <TextInput
                  value={traderInput}
                  onChangeText={setTraderInput}
                  placeholder="0x... or trader.mon"
                  placeholderTextColor={t.ink6}
                  autoCapitalize="none"
                  style={{
                    height: 46,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: t.a16,
                    paddingHorizontal: 14,
                    color: t.ink,
                    fontFamily: fonts.mono,
                    fontSize: 12,
                    backgroundColor: t.card,
                  }}
                />
              </View>
              <Pressable
                onPress={handleAddTrader}
                style={({ pressed }) => ({
                  height: 48,
                  borderRadius: 13,
                  backgroundColor: pressed ? t.purpHov : t.purp,
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 6,
                })}
              >
                <T style={{ fontSize: 14, fontFamily: fonts.semibold, color: t.inv }}>Add to Room Watchlist</T>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
