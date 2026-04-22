package com.brooks.social.event;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.UUID;

@Getter
@AllArgsConstructor
public class FollowEvent {
    private final UUID followerId;
    private final UUID followingId;
    private final boolean followed; // true = followed, false = unfollowed
}
